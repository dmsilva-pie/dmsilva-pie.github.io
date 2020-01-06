/** 
 * Web Worker meant to facilitate model tesselation process 
 */

//Data arrays to compute
var newPositionArray = [];
var newNormalArray = [];
var newUVArray = [];
var newIndexArray = [];
var newBorder = [];

onmessage = function (e) {

    var positionCount = e.data.positionCount;
    var totalIndexCount = e.data.totalIndexCount;
    var positionBuffer = e.data.positions;
    var normalBuffer = e.data.normals;
    var uvBuffer = e.data.uvs;
    var indexBuffer = e.data.indexes;

    //Restore ArrayBuffer views
    var positions = new Float32Array(positionBuffer);
    var normals = new Float32Array(normalBuffer);
    var uvs = new Float32Array(uvBuffer);
    var indexes = [];
    
    if (e.data.indexBufferType === 1) {
        indexes = new Uint8Array(indexBuffer);
    }
    else if (e.data.indexBufferType === 2) {
        indexes = new Uint16Array(indexBuffer);
    }
    else if (e.data.indexBufferType === 4) {
        indexes = new Uint32Array(indexBuffer);
    }
    else indexes = new BigUint64Array(indexBuffer);

    //Initialize new data containers
    newPositionArray = Array.from(positions);
    newNormalArray = Array.from(normals);
    newUVArray = Array.from(uvs);

    if (positionCount + (totalIndexCount / 3) <= Math.pow(2, 8)) {
        newIndexArray = new Uint8Array(totalIndexCount * 2);
    }
    else if (positionCount + (totalIndexCount / 3) <= Math.pow(2, 16)) {
        newIndexArray = new Uint16Array(totalIndexCount * 2);
    }
    else if (positionCount + (totalIndexCount / 3) <= Math.pow(2, 32)) {
        newIndexArray = new Uint32Array(totalIndexCount * 2);
    }
    else newIndexArray = new BigUint64Array(totalIndexCount * 2);

    //Map vertexes by their attributes. 
    //The following approach can result in higher bucket conflicts, but seems to perform faster than key string/custom hash alternatives.
    var mapPositions = new Map();

    for (var i = 0; i < positionCount; i++) {
        var key = positions[(i * 3)] + positions[(i * 3) + 1] + positions[(i * 3) + 2]
            + normals[(i * 3)] + normals[(i * 3) + 1] + normals[(i * 3) + 2]
            + uvs[(i * 2)] + uvs[(i * 2) + 1];
        if (!mapPositions.has(key))
            mapPositions.set(key, [i]);
        else
            mapPositions.get(key).push(i);
    }

    var vertex1 = [0, 0, 0]; var vertex2 = [0, 0, 0]; var vertex3 = [0, 0, 0];
    var normal1 = [0, 0, 0]; var normal2 = [0, 0, 0]; var normal3 = [0, 0, 0];
    var uv1 = [0, 0]; var uv2 = [0, 0]; var uv3 = [0, 0];

    var indexIdx = 0; //Index of current vertex index in the indexes array
    var currVertexIdx = positionCount; //Index of next vertex to be added

    //Border Change Queue. Will be returned to main thread for syncing.
    newBorder = new Uint32Array(totalIndexCount);
    var currBorderQueueIdx = 0;

    for (var indexCount = 0; indexCount * 3 < totalIndexCount; indexCount++) {

        var index1 = indexes[(indexCount * 3)];
        var index2 = indexes[(indexCount * 3) + 1];
        var index3 = indexes[(indexCount * 3) + 2];

        vertex1[0] = positions[(index1 * 3)];
        vertex1[1] = positions[(index1 * 3) + 1];
        vertex1[2] = positions[(index1 * 3) + 2];
        vertex2[0] = positions[(index2 * 3)];
        vertex2[1] = positions[(index2 * 3) + 1];
        vertex2[2] = positions[(index2 * 3) + 2];
        vertex3[0] = positions[(index3 * 3)];
        vertex3[1] = positions[(index3 * 3) + 1];
        vertex3[2] = positions[(index3 * 3) + 2];

        normal1[0] = normals[(index1 * 3)];
        normal1[1] = normals[(index1 * 3) + 1];
        normal1[2] = normals[(index1 * 3) + 2];
        normal2[0] = normals[(index2 * 3)];
        normal2[1] = normals[(index2 * 3) + 1];
        normal2[2] = normals[(index2 * 3) + 2];
        normal3[0] = normals[(index3 * 3)];
        normal3[1] = normals[(index3 * 3) + 1];
        normal3[2] = normals[(index3 * 3) + 2];

        uv1[0] = uvs[(index1 * 2)];
        uv1[1] = uvs[(index1 * 2) + 1];
        uv2[0] = uvs[(index2 * 2)];
        uv2[1] = uvs[(index2 * 2) + 1];
        uv3[0] = uvs[(index3 * 2)];
        uv3[1] = uvs[(index3 * 2) + 1];

        //Detect largest edge to divide
        var dist1 = Math.sqrt(Math.pow((vertex2[0] - vertex1[0]), 2) + Math.pow((vertex2[1] - vertex1[1]), 2) + Math.pow((vertex2[2] - vertex1[2]), 2));
        var dist2 = Math.sqrt(Math.pow((vertex3[0] - vertex2[0]), 2) + Math.pow((vertex3[1] - vertex2[1]), 2) + Math.pow((vertex3[2] - vertex2[2]), 2));
        var dist3 = Math.sqrt(Math.pow((vertex3[0] - vertex1[0]), 2) + Math.pow((vertex3[1] - vertex1[1]), 2) + Math.pow((vertex3[2] - vertex1[2]), 2));
        var maxDist = Math.max(dist1, dist2, dist3);

        //Create 2 new subdivided faces, splitting the largest edge.
        if (maxDist == dist1) {
            //Vertex 1
            newIndexArray[indexIdx++] = index1;
            //New vertex
            var newVertex = addNewIndexedVertex(vertex1, normal1, uv1, vertex2, normal2, uv2, indexIdx++, currVertexIdx, mapPositions, newIndexArray, newPositionArray, newNormalArray, newUVArray);
            if (newVertex === currVertexIdx) currVertexIdx++;
            updateBorderNewVertex2(newBorder, currBorderQueueIdx, index1, index2, newVertex);
            currBorderQueueIdx += 3;
            //Vertex 3
            newIndexArray[indexIdx++] = index3;
            //Vertex 2
            newIndexArray[indexIdx++] = index2;
            //Vertex 3
            newIndexArray[indexIdx++] = index3;
            //New vertex
            newIndexArray[indexIdx++] = newVertex;
        }
        else if (maxDist == dist2) {
            //Vertex 1
            newIndexArray[indexIdx++] = index1;
            //Vertex 2
            newIndexArray[indexIdx++] = index2;
            //New vertex
            var newVertex = addNewIndexedVertex(vertex2, normal2, uv2, vertex3, normal3, uv3, indexIdx++, currVertexIdx, mapPositions, newIndexArray, newPositionArray, newNormalArray, newUVArray);
            if (newVertex === currVertexIdx) currVertexIdx++;
            updateBorderNewVertex2(newBorder, currBorderQueueIdx, index2, index3, newVertex);
            currBorderQueueIdx += 3;
            //Vertex 1
            newIndexArray[indexIdx++] = index1;
            //New vertex
            newIndexArray[indexIdx++] = newVertex;
            //Vertex 3
            newIndexArray[indexIdx++] = index3;
        }
        else {
            //Vertex 1
            newIndexArray[indexIdx++] = index1;
            //Vertex 2
            newIndexArray[indexIdx++] = index2;
            //New vertex
            var newVertex = addNewIndexedVertex(vertex1, normal1, uv1, vertex3, normal3, uv3, indexIdx++, currVertexIdx, mapPositions, newIndexArray, newPositionArray, newNormalArray, newUVArray);
            if (newVertex === currVertexIdx) currVertexIdx++;
            updateBorderNewVertex2(newBorder, currBorderQueueIdx, index1, index3, newVertex);
            currBorderQueueIdx += 3;
            //Vertex 2
            newIndexArray[indexIdx++] = index2;
            //Vertex 3
            newIndexArray[indexIdx++] = index3;
            //New vertex
            newIndexArray[indexIdx++] = newVertex;
        }
    }

    newPositionArray = Float32Array.from(newPositionArray);
    newNormalArray = Float32Array.from(newNormalArray);
    newUVArray = Float32Array.from(newUVArray);

    self.postMessage({
        newPositionArray: newPositionArray.buffer,
        newNormalArray: newNormalArray.buffer,
        newUVArray: newUVArray.buffer,
        newBorder: newBorder.buffer,
        newIndexArray: newIndexArray.buffer,
    }, [newPositionArray.buffer, newNormalArray.buffer, newUVArray.buffer, newBorder.buffer, newIndexArray.buffer]);

    newPositionArray = [];
    newNormalArray = [];
    newUVArray = [];
    newIndexArray = [];
    newBorder = [];
}

function updateBorderNewVertex2(border, currBorderQueueIdx, index1, index2, newVertex) {
    //Saves all border changes in queue to pass to main thread
    border[currBorderQueueIdx] = newVertex;
    border[currBorderQueueIdx+1] = index1;
    border[currBorderQueueIdx+2] = index2;
}

function addNewIndexedVertex(vertex1, normal1, uv1, vertex2, normal2, uv2, indexIdx, currVertexIdx, map, indexArray, positionArray, normalArray, UVArray) {
    var posVx = (vertex1[0] + vertex2[0]) / 2;
    var posVy = (vertex1[1] + vertex2[1]) / 2;
    var posVz = (vertex1[2] + vertex2[2]) / 2;

    var norVx = (normal1[0] + normal2[0]) / 2;
    var norVy = (normal1[1] + normal2[1]) / 2;
    var norVz = (normal1[2] + normal2[2]) / 2;

    var round = Math.pow(10, 6);
    var uvVu = (Math.round((uv1[0] + uv2[0]) * round) / round) / 2;
    var uvVv = (Math.round((uv1[1] + uv2[1]) * round) / round) / 2;

    var addedIndex = -1;

    var mapId = posVx + posVy + posVz + norVx + norVy + norVz + uvVu + uvVv;

    if (map.has(mapId)) {
        var indexes = map.get(mapId);

        for (var idx in indexes) {
            if (positionArray[(idx * 3)] === posVx && positionArray[(idx * 3) + 1] === posVy && positionArray[(idx * 3) + 2] === posVz
                && normalArray[(idx * 3)] === norVx && normalArray[(idx * 3) + 1] === norVy && normalArray[(idx * 3) + 2] === norVz
                && UVArray[(idx * 2)] === uvVu && UVArray[(idx * 2) + 1] === uvVv) {
                addedIndex = idx;
                break;
            }
        }
    }
    if (addedIndex !== -1) {
        indexArray[indexIdx] = addedIndex;
    }
    else {
        addedIndex = currVertexIdx;
        indexArray[indexIdx] = currVertexIdx;

        if (!map.has(mapId))
            map.set(mapId, [currVertexIdx]);
        else
            map.get(mapId).push(currVertexIdx);

        positionArray.push(posVx, posVy, posVz);
        normalArray.push(norVx, norVy, norVz);
        UVArray.push(uvVu, uvVv);
    }
    return addedIndex;
}