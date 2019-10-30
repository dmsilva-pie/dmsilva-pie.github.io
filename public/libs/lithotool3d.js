/* 
 * Lithographic costumization 3D Viewer
 *
 * Authors: Diogo Silva, Mafalda ...
 * 
 * For inquiries: dm-.silva@campus.fct.unl
 *
 */

//import * as THREE from './threejs/build/three.js';
//import { OrbitControls } from './threejs/examples/jsm/controls/OrbitControls.js';

//"use strict";

//Scene variables
var container, scene, renderer, camera, controls;
var manager = new THREE.LoadingManager();
var textureLoader = new THREE.TextureLoader(manager);
var imageLoader = new THREE.ImageLoader(manager);
var helper;

//Model variables
var modelType = "";

var group_root = null;
var models = [], models_map = {},
    surfaces = [], surfaces_map = {},
    og_surfaces = [], curr_surfaces = [];

var lodState = [];
var scaleState = [];

var scaleFactor = 1; //How much scaling to normalize mesh size.
var translateFactor = { x: 0, y: 0, z: 0 }; //How much translation to center objects.

//Materials/Texture
var viewerMode = "color";
var colorMaterial, wireMaterial;
var surfaceMaterials = [];
var textures = [];

var surfaceState = [];
var referenceImages = [];
var refType = [];

//Constants
const MODEL_ID = ["base", "model"];
const SCALE_UNIFORM = [50, 50, 50];
const REF_TYPE = Object.freeze({
    POSITIVE: "positive",
    NEGATIVE: "negative"
});
const MIN_MED_THRESHOLD = 65536;

//Misc
var isMobile = (/Mobi|Android/i.test(navigator.userAgent));

var clock = null;
var delta = 0;
var interval = 1 / 30;

/** ___________Setup Functions_________ */
function createScene() {

    if (scene != null)
        return;

    container = document.getElementById('viewer');

    /**________CAMERA______________*/

    camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 1, 1000);
    camera.up.set(0, 1, 0);
    camera.position.set(300, 20, 0);
    camera.add(new THREE.PointLight(0xffffff, 0.8));

    /** _______SCENE______________ */

    scene = new THREE.Scene();
    scene.add(camera);

    helper = new THREE.GridHelper(260, 20, 0xFF5555, 0xF0F0F0);
    helper.position.y = -40;
    scene.add(helper);

    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    /*_____CONTROLS________*/
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);
    controls.target.set(0, 1.2, 2);
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = 1.65;
    controls.update();

    window.addEventListener('resize', onWindowResize, false);

    /*if(isMobile){
        clock = new THREE.Clock();
        animateMobile();
    }
    else
        animate();*/
    animate();
}

function onWindowResize() {
    camera.aspect = (container.clientWidth) / (container.clientHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function animateMobile() {
    requestAnimationFrame(animateMobile);
    delta += clock.getDelta();

    if (delta > interval) {
        render();
        delta = delta % interval;
    }
}

function render() {
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
}

function resetScene() {
    scene.remove(group_root);

    curr_surfaces.forEach(surface => surface.dispose());
    og_surfaces.forEach(surface => surface.dispose());
    surfaces.forEach(surface => surface.geometry.dispose());
    models.forEach(surface => surface.geometry.dispose());

    curr_surfaces = [];
    og_surfaces = [];
    surfaces = [];
    models = [];

    models_map = {};
    surfaces_map = {};

    colorMaterial.dispose();
    colorMaterial = null;
    wireMaterial.dispose();
    wireMaterial = null;
    textures.forEach(tex => tex && tex.dispose());
    textures = [];
    surfaceMaterials.forEach(mat => mat.dispose());
    surfaceMaterials = [];

    lodState = [];
    scaleState = [];
    surfaceState = [];
    referenceImages = [];
    refType = [];

    group_root = null;
}


/** ___________API Functions_________ */

function loadModel(uri, type, color) {

    return new Promise((resolve, reject) => {

        if (group_root) {
            //Reset model data and scene, memory management
            resetScene();
        }

        //_____Load object________
        var onProgress = function (xhr) { };
        var onError = function (xhr) { reject(xhr) };
        var surfaceList = [];

        var loader = new THREE.OBJLoader(manager);
        loader.load(uri, function (object) {
            object.name = 'group_root';
            group_root = object;

            //De-group geometries into separate meshes, if necessary.
            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {

                    if (child.geometry.groups.length > 0) {

                        child.geometry.groups.forEach((group, index) => {

                            var startIndex = group.start;
                            var count = group.count;

                            var position = new Float32Array(count * 3);
                            var normal = new Float32Array(count * 3);
                            var uv = new Float32Array(count * 2);

                            for (var i = 0; i < count * 3; i++)
                                position[i] = child.geometry.getAttribute("position").array[(startIndex * 3) + i];

                            for (var i = 0; i < count * 3; i++)
                                normal[i] = child.geometry.getAttribute("normal").array[(startIndex * 3) + i];

                            for (var i = 0; i < count * 2; i++)
                                uv[i] = child.geometry.getAttribute("uv").array[(startIndex * 2) + i];

                            var geometry = new THREE.BufferGeometry();
                            geometry.addAttribute("position", new THREE.BufferAttribute(position, 3));
                            geometry.addAttribute("normal", new THREE.BufferAttribute(normal, 3));
                            geometry.addAttribute("uv", new THREE.BufferAttribute(uv, 2));
                            var mat = child.material[group.materialIndex];
                            var mesh = new THREE.Mesh(geometry, mat);
                            mesh.name = "Surface: " + child.name + "" + index;

                            object.add(mesh);
                        });

                        child.geometry.dispose();
                        object.remove(child);
                    }
                }
            });

            var xS = null, yS = null, zS = null;
            var xL = null, yL = null, zL = null;
            var surfaceCount = 0, modelCount = 0;

            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {

                    if (child.geometry.index !== null)
                        child.geometry.toNonIndexed();

                    //Find normalization factor components
                    var amount = child.geometry.getAttribute('position').count / 3;
                    var vertices = child.geometry.getAttribute('position').array;

                    if (xS == null) {
                        xS = vertices[0]; yS = vertices[1]; zS = vertices[2];
                        xL = vertices[0]; yL = vertices[1]; zL = vertices[2];
                    }

                    for (var i = 0; i < amount; i++) {

                        var x = vertices[i * 3];
                        var y = vertices[(i * 3) + 1];
                        var z = vertices[(i * 3) + 2];

                        //Determine smallest and largest vertex scalars
                        xS = (xS > x) ? x : xS; xL = (xL < x) ? x : xL;
                        yS = (yS > y) ? y : yS; yL = (yL < y) ? y : yL;
                        zS = (zS > z) ? z : zS; zL = (zL < z) ? z : zL;
                    }

                    if (MODEL_ID.includes(child.name)) {
                        //We deal with static model reference storage
                        models.push(child);
                        models_map[child.name] = modelCount;
                        modelCount++;
                    }
                    else {

                        var vertexNumber = child.geometry.getAttribute("position").count;

                        for (var medAmount = 0; ; medAmount++) {
                            if (vertexNumber * Math.pow(2, medAmount) >= MIN_MED_THRESHOLD)
                                break;
                        }

                        surfaces.push(child);
                        surfaceList.push({ name: child.name, med: medAmount });

                        //Initialize texture material unique to each surface
                        var placeholderSurfaceImage = placeholderImage(surfaceCount);
                        var texture = textureLoader.load(placeholderSurfaceImage);
                        texture.minFilter = THREE.LinearFilter;

                        var material = new THREE.MeshBasicMaterial({
                            map: texture
                        });

                        surfaceMaterials.push(material);

                        //We deal with customizable surface reference storage
                        textures.push(null);
                        referenceImages.push(null);

                        surfaces_map[child.name] = surfaceCount;

                        lodState.push(0);
                        scaleState.push(0);
                        surfaceState.push(true);
                        refType.push(REF_TYPE.POSITIVE);

                        surfaceCount++;
                    }
                }
            });


            //Normalization and scale factors
            var xM = (Math.max(Math.abs(xL), Math.abs(xS)) - ((xS + xL) / 2));
            var yM = (Math.max(Math.abs(yL), Math.abs(yS)) - ((yS + yL) / 2));
            var zM = (Math.max(Math.abs(zL), Math.abs(zS)) - ((zS + zL) / 2));

            scaleFactor = 1 / Math.sqrt(Math.pow(xM, 2) + Math.pow(yM, 2) + Math.pow(zM, 2));
            translateFactor = { x: (xS + xL) / 2, y: (yS + yL) / 2, z: (zS + zL) / 2 };

            //Shared Materials
            colorMaterial = new THREE.MeshPhongMaterial({
                bumpScale: 1,
                color: color,
                specular: new THREE.Color(0.1 * 0.2, 0.1 * 0.2, 0.1 * 0.2),
                reflectivity: 0.1,
                shininess: 30
            });
            wireMaterial = new THREE.MeshBasicMaterial({
                color: color,
                wireframe: true
            });

            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {

                    //Normalize models and scale to uniform default
                    child.geometry.translate(-translateFactor.x, -translateFactor.y, -translateFactor.z);
                    child.geometry.scale(scaleFactor, scaleFactor, scaleFactor);
                    child.geometry.scale(SCALE_UNIFORM[0], SCALE_UNIFORM[1], SCALE_UNIFORM[2]);

                    child.geometry.normalizeNormals();
                    child.geometry.computeBoundingBox();

                    //Initialize materials
                    child.material.dispose();
                    child.material = colorMaterial;

                    if (!MODEL_ID.includes(child.name)) {
                        og_surfaces.push(child.geometry.clone());
                        curr_surfaces.push(child.geometry.clone());
                    }
                }
            });

            scene.add(object);

        }, onProgress, onError);

        modelType = type;

        resolve(surfaceList);
    })
}

function colorize(color) {
    return new Promise((resolve, reject) => {

        if (group_root) {
            //Change color for shared materials
            colorMaterial.color.set(color.hex);
            wireMaterial.color.set(color.hex);

            colorMaterial.needsUpdate = true;
            wireMaterial.needsUpdate = true;

            resolve(1);
        }
        else
            resolve(0);

    })
}

function changeViewMode(mode) {
    return new Promise((resolve, reject) => {

        if (group_root && viewerMode !== mode.toLowerCase()) {

            //Update material on static models
            models.forEach(model => {
                switch (mode) {
                    case "wireframe":
                        model.material = wireMaterial; break;
                    default:
                        model.material = colorMaterial; break;
                }
            });

            //Update materials on dynamic surfaces
            surfaces.forEach((surface, index) => {
                switch (mode) {
                    case "wireframe":
                        surface.material = wireMaterial; break;
                    case "texture":
                        surface.material = surfaceMaterials[index];
                        break;
                    default:
                        surface.material = colorMaterial; break;
                }
            });

            viewerMode = mode.toLowerCase();
        }
        resolve(1);
    })
}

function addReference(index, image, detailLevel, scale) {
    return new Promise((resolve, reject) => {

        var newTexture = textureLoader.load(image);
        newTexture.minFilter = THREE.LinearFilter;
        newTexture.needsUpdate = true;

        if (textures[index]) {

            //Get old definitions
            var texture = textures[index];
            var offset = texture.offset;
            var repeat = texture.repeat;
            var rotation = texture.rotation;
            var wrapT = texture.wrapT;
            var wrapS = texture.wrapS;
            var flipY = texture.flipY;
            var center = texture.center;

            //Apply them to a new texture
            newTexture.offset = offset;
            newTexture.repeat = repeat;
            newTexture.rotation = rotation;
            newTexture.wrapT = wrapT;
            newTexture.wrapS = wrapS;
            newTexture.flipY = flipY;
            newTexture.center = center;

            texture.dispose();
        }

        textures[index] = newTexture;
        surfaceMaterials[index].map = newTexture;
        surfaceMaterials[index].needsUpdate = true;

        //Process the image
        processImage(image, index).then(result => {
            //Apply initial deformation and apply image reference to mesh
            updateSurface(index, detailLevel, scale);
        });
        resolve(1);
    })
}

function removeReference(index) {
    return new Promise((resolve, reject) => {

        if (textures[index]) {

            var texture = textures[index];
            texture.dispose();

            //Re-apply placeholder texture
            var placeholderSurfaceImage = placeholderImage(index);
            var newTexture = textureLoader.load(placeholderSurfaceImage);
            newTexture.minFilter = THREE.LinearFilter;

            textures[index] = null;
            surfaceMaterials[index].map = newTexture;
            surfaceMaterials[index].needsUpdate = true;

            referenceImages[index] = null;
            curr_surfaces[index].dispose();

            if (surfaces[index].geometry) surfaces[index].geometry.dispose();
            surfaces[index].geometry = og_surfaces[index].clone();
        }
        resolve(1);
    })
}

function placeholderImage(index) {
    return "../img/" + (index + 1) + ".png";
}

function updateSurface(index, detailLevel, scale) {
    return new Promise((resolve, reject) => {

        if (lodState[index] != detailLevel && detailLevel > 0) {

            //We subdivide the surface mesh
            var geometry = (detailLevel - lodState[index]) < 0 ? og_surfaces[index].clone() : curr_surfaces[index];

            var divisions = (detailLevel - lodState[index]) < 0 ? detailLevel : (detailLevel - lodState[index]);
            for (var i = 0; i < divisions; i++) {
                bufferGeometryTesselate(geometry);
            }

            if (surfaces[index].geometry) surfaces[index].geometry.dispose();

            surfaces[index].geometry = surfaceState[index] ? geometry : og_surfaces[index];
            if ((detailLevel - lodState[index]) < 0) {
                curr_surfaces[index].dispose();
            }
            curr_surfaces[index] = geometry.clone();
            lodState[index] = detailLevel;

            //If a reference exists, we apply it.
            if (textures[index]) {
                applyReference(index, scale, true);
            }

            resolve(1);
        }
        else if (textures[index] && surfaceState[index]) {
            //The mesh doesn't need subdivision, we only apply the reference.
            applyReference(index, scale);
            resolve(2);
        }
        else
            reject(-1);
    })
}

function applyReference(index, scale, bypassCached = false) {

    if (surfaceState[index]) {
        var geometry;

        if (!bypassCached) {
            if (surfaces[index].geometry) surfaces[index].geometry.dispose();

            geometry = curr_surfaces[index].clone();
        }
        else
            geometry = surfaces[index].geometry;


        var count = geometry.getAttribute("position").count;
        var vertexs = geometry.getAttribute("position").array;
        var normals = geometry.getAttribute("normal").array;
        var uvs = geometry.getAttribute("uv").array;

        var vector = new THREE.Vector2(0, 0);
        for (var i = 0; i < count; i++) {
            var heightValue = lookupReferenceData(uvs[i * 2], uvs[(i * 2) + 1], index, vector);
            var value = refType[index] == REF_TYPE.POSITIVE ? heightValue : 1 - heightValue;

            vertexs[i * 3] += normals[i * 3] * value * scale;
            vertexs[(i * 3) + 1] += normals[(i * 3) + 1] * value * scale;
            vertexs[(i * 3) + 2] += normals[(i * 3) + 2] * value * scale;
        }
        vertexs.needsUpdate = true;
        geometry.computeVertexNormals();

        surfaces[index].geometry = geometry;
        scaleState[index] = scale;
    }
}

function lookupReferenceData(u, v, index, vec) {
    vec.set(u, v);
    var uv = textures[index].transformUv(vec);
    var width = referenceImages[index].width;
    var height = referenceImages[index].height;

    var ux = uv.x < 0 ? 0 : (uv.x > 1 ? 1 : uv.x);
    var vx = uv.y < 0 ? 0 : (uv.y > 1 ? 1 : uv.y);

    var tx = Math.min(Math.round(ux * width), width - 1);
    var ty = Math.min(Math.round(vx * height), height - 1);
    var offset = (ty * width + tx);

    var value = referenceImages[index].data[offset];

    //If the UVs belong to the edges of UV/image range, return scale value 0 to prevent broken borders.
    //Ideally we'd have a means to calculate which vertexes belong to the border, but that'd be far too computationally heavy for real time manipulation?
    if ((u <= 0 || u >= 1 || v <= 0 || v >= 1) || (tx <= 0 || tx >= width - 1 || ty <= 0 || ty >= height - 1)) {
        value = refType[index] == REF_TYPE.POSITIVE ? 0 : 1;
    }

    return value;
}

function processImage(image, index) {
    return new Promise((resolve, reject) => {
        imageLoader.load(image,
            target => {

                var imgWidth = target.naturalWidth;
                var imgHeight = target.naturalHeight;

                var imageLoadCanvas = document.createElement("Canvas");
                imageLoadCanvas.width = imgWidth;
                imageLoadCanvas.height = imgHeight;
                imageLoadCanvas.getContext('2d').drawImage(target, 0, 0);

                var imgData = imageLoadCanvas.getContext('2d').getImageData(0, 0, imgWidth, imgHeight);
                var cWidth = imgData.width;
                var cHeight = imgData.height;
                var data = imgData.data;

                var pixel_offset = 0; // current image pixel being processed
                var height_pixel_index = 0; // current position in the height data
                var heightData = new Float32Array(data.length / 4);

                for (var y = 0; y < cHeight; y++) {
                    for (var x = 0; x < cWidth; x++) {
                        pixel_offset = (y * 4) * cWidth + x * 4;

                        // create negative monochrome value from red, green and blue values
                        var lum = 0.299 * data[pixel_offset] + 0.587 * data[pixel_offset + 1] + 0.114 * data[pixel_offset + 2];

                        heightData[height_pixel_index++] = (lum / 255);
                    }
                }

                imageLoadCanvas.getContext('2d').putImageData(imgData, 0, 0, 0, 0, cWidth, cHeight);
                referenceImages[index] = { width: cWidth, height: cHeight, data: heightData };

                resolve(1);
            }
        );
    });
}

function changeReferenceState(index, state, scale) {
    return new Promise((resolve, reject) => {
        if (!state && surfaceState[index] != state) {

            if (surfaces[index].geometry) surfaces[index].geometry.dispose();
            surfaces[index].geometry = og_surfaces[index].clone();
            surfaceState[index] = false;

        }
        else if (state && surfaceState[index] != state) {

            surfaceState[index] = true;
            applyReference(index, scale);

        }
        resolve(1);
    });
}

/**
 * @param {int} index The index of the surface.
 * @param {string} type The type of the reference, from those within "REF_TYPE": [positive] or [negative].
 */
function changeReferenceType(index, type, scale) {
    return new Promise((resolve, reject) => {
        switch (type.toLowerCase()) {
            case "positive":
                refType[index] = REF_TYPE.POSITIVE;
                break;
            case "negative":
                refType[index] = REF_TYPE.NEGATIVE;
                break;
            default:
                refType[index] = REF_TYPE.POSITIVE;
                break;
        }

        applyReference(index, scale);
        resolve(1);
    });
}

function changeReferencePosition(index, tx, ty, sx, sy, rotation, scale) {
    return new Promise((resolve, reject) => {

        var texture = textures[index];

        var mat = surfaces[index].material;
        surfaces[index].material = surfaceMaterials[index];
        surfaceMaterials[index].needsUpdate = true;

        texture.center.set(0.5, 0.5);
        texture.offset.set(-tx / 100, -ty / 100);
        texture.repeat.set(sx / 100, sy / 100);
        texture.rotation = rotation;
        texture.needsUpdate = true;

        render();
        surfaces[index].material = mat;
        applyReference(index, scale);
    });
}

function downloadOBJ(xF = 1, yF = 1, zF = 1, change) {
    if (group_root) {
        if (change) {
            var sceneClone = group_root.clone();

            sceneClone.traverse(function (child) {
                if (child instanceof THREE.Mesh) {

                    //Return to normal scale and position.
                    child.geometry.scale(1 / scaleFactor, 1 / scaleFactor, 1 / scaleFactor);
                    child.geometry.scale(1 / SCALE_UNIFORM[0], 1 / SCALE_UNIFORM[1], 1 / SCALE_UNIFORM[2]);
                    child.geometry.scale(xF, yF, zF);
                    child.geometry.translate(translateFactor.x, translateFactor.y, translateFactor.z);

                    child.geometry.computeBoundingBox();
                }
            });

            var exporter = new THREE.OBJExporter();
            var result = exporter.parse(sceneClone);

            sceneClone.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                }
            });
        }
        else {
            var exporter = new THREE.OBJExporter();
            var result = exporter.parse(group_root);
        }

        var blob = new Blob([result], { type: 'application/octet-stream' });
        saveAs(blob, "model" + '.obj');
        return true;
    }
    else
        return false;
}





/* UTILS */

function bufferGeometryTesselate(geometry) {

    var positions = geometry.getAttribute("position");
    var normals = geometry.getAttribute("normal");
    var uvs = geometry.getAttribute("uv");

    var newPositionArray = new Float32Array(positions.array.length * 2);
    var newNormalArray = new Float32Array(normals.array.length * 2);
    var newUVArray = new Float32Array(uvs.array.length * 2);

    var count = positions.count;

    var vertex1 = [0, 0, 0];
    var vertex2 = [0, 0, 0];
    var vertex3 = [0, 0, 0];

    var normal1 = [0, 0, 0];
    var normal2 = [0, 0, 0];
    var normal3 = [0, 0, 0];

    var uv1 = [0, 0];
    var uv2 = [0, 0];
    var uv3 = [0, 0];

    for (var count3 = 0; count3 < count; count3 += 3) {

        vertex1[0] = positions.array[(count3 * 3)];
        vertex1[1] = positions.array[(count3 * 3) + 1];
        vertex1[2] = positions.array[(count3 * 3) + 2];
        vertex2[0] = positions.array[(count3 * 3) + 3];
        vertex2[1] = positions.array[(count3 * 3) + 4];
        vertex2[2] = positions.array[(count3 * 3) + 5];
        vertex3[0] = positions.array[(count3 * 3) + 6];
        vertex3[1] = positions.array[(count3 * 3) + 7];
        vertex3[2] = positions.array[(count3 * 3) + 8];

        normal1[0] = normals.array[(count3 * 3)];
        normal1[1] = normals.array[(count3 * 3) + 1];
        normal1[2] = normals.array[(count3 * 3) + 2];
        normal2[0] = normals.array[(count3 * 3) + 3];
        normal2[1] = normals.array[(count3 * 3) + 4];
        normal2[2] = normals.array[(count3 * 3) + 5];
        normal3[0] = normals.array[(count3 * 3) + 6];
        normal3[1] = normals.array[(count3 * 3) + 7];
        normal3[2] = normals.array[(count3 * 3) + 8];

        uv1[0] = uvs.array[(count3 * 2)];
        uv1[1] = uvs.array[(count3 * 2) + 1];
        uv2[0] = uvs.array[(count3 * 2) + 2];
        uv2[1] = uvs.array[(count3 * 2) + 3];
        uv3[0] = uvs.array[(count3 * 2) + 4];
        uv3[1] = uvs.array[(count3 * 2) + 5];

        //Detect largest edge to divide
        var dist1 = Math.sqrt(Math.pow((vertex2[0] - vertex1[0]), 2) + Math.pow((vertex2[1] - vertex1[1]), 2) + Math.pow((vertex2[2] - vertex1[2]), 2));
        var dist2 = Math.sqrt(Math.pow((vertex3[0] - vertex2[0]), 2) + Math.pow((vertex3[1] - vertex2[1]), 2) + Math.pow((vertex3[2] - vertex2[2]), 2));
        var dist3 = Math.sqrt(Math.pow((vertex3[0] - vertex1[0]), 2) + Math.pow((vertex3[1] - vertex1[1]), 2) + Math.pow((vertex3[2] - vertex1[2]), 2));

        var maxDist = Math.max(dist1, dist2, dist3);

        //Create 2 new subdivided faces, splitting the largest edge.
        if (maxDist == dist1) {
            //Vertex 1
            addVertex(vertex1, normal1, uv1, count3, 0, 0, newPositionArray, newNormalArray, newUVArray);

            //New vertex
            addNewVertex(vertex1, normal1, uv1, vertex2, normal2, uv2, count3, 3, 2, newPositionArray, newNormalArray, newUVArray);

            //Vertex 3
            addVertex(vertex3, normal3, uv3, count3, 6, 4, newPositionArray, newNormalArray, newUVArray);

            //Vertex 2
            addVertex(vertex2, normal2, uv2, count3, 9, 6, newPositionArray, newNormalArray, newUVArray);

            //Vertex 3
            addVertex(vertex3, normal3, uv3, count3, 12, 8, newPositionArray, newNormalArray, newUVArray);

            //New vertex
            addNewVertex(vertex1, normal1, uv1, vertex2, normal2, uv2, count3, 15, 10, newPositionArray, newNormalArray, newUVArray);
        }
        else if (maxDist == dist2) {
            //Vertex 1
            addVertex(vertex1, normal1, uv1, count3, 0, 0, newPositionArray, newNormalArray, newUVArray);

            //Vertex 2
            addVertex(vertex2, normal2, uv2, count3, 3, 2, newPositionArray, newNormalArray, newUVArray);

            //New vertex
            addNewVertex(vertex2, normal2, uv2, vertex3, normal3, uv3, count3, 6, 4, newPositionArray, newNormalArray, newUVArray);

            //Vertex 1
            addVertex(vertex1, normal1, uv1, count3, 9, 6, newPositionArray, newNormalArray, newUVArray);

            //New vertex
            addNewVertex(vertex2, normal2, uv2, vertex3, normal3, uv3, count3, 12, 8, newPositionArray, newNormalArray, newUVArray);

            //Vertex 3
            addVertex(vertex3, normal3, uv3, count3, 15, 10, newPositionArray, newNormalArray, newUVArray);
        }
        else {
            //Vertex 1
            addVertex(vertex1, normal1, uv1, count3, 0, 0, newPositionArray, newNormalArray, newUVArray);

            //Vertex 2
            addVertex(vertex2, normal2, uv2, count3, 3, 2, newPositionArray, newNormalArray, newUVArray);

            //New vertex
            addNewVertex(vertex1, normal1, uv1, vertex3, normal3, uv3, count3, 6, 4, newPositionArray, newNormalArray, newUVArray);

            //Vertex 2
            addVertex(vertex2, normal2, uv2, count3, 9, 6, newPositionArray, newNormalArray, newUVArray);

            //Vertex 3
            addVertex(vertex3, normal3, uv3, count3, 12, 8, newPositionArray, newNormalArray, newUVArray);

            //New vertex
            addNewVertex(vertex1, normal1, uv1, vertex3, normal3, uv3, count3, 15, 10, newPositionArray, newNormalArray, newUVArray);
        }
    }

    geometry.addAttribute("position", new THREE.BufferAttribute(newPositionArray, 3, false));
    geometry.addAttribute("normal", new THREE.BufferAttribute(newNormalArray, 3, false));
    geometry.addAttribute("uv", new THREE.BufferAttribute(newUVArray, 2, false));
    geometry.needsUpdate = true;
}

function addVertex(vertex, normal, uv, count3, i3, i2, positionArray, normalArray, UVArray) {
    positionArray[(count3 * 6) + i3] = vertex[0];
    positionArray[(count3 * 6) + i3 + 1] = vertex[1];
    positionArray[(count3 * 6) + i3 + 2] = vertex[2];

    normalArray[(count3 * 6) + i3] = normal[0];
    normalArray[(count3 * 6) + i3 + 1] = normal[1];
    normalArray[(count3 * 6) + i3 + 2] = normal[2];

    UVArray[(count3 * 4) + i2] = uv[0];
    UVArray[(count3 * 4) + i2 + 1] = uv[1];
}

function addNewVertex(vertex1, normal1, uv1, vertex2, normal2, uv2, count3, i3, i2, positionArray, normalArray, UVArray) {
    positionArray[(count3 * 6) + i3] = (vertex1[0] + vertex2[0]) / 2;
    positionArray[(count3 * 6) + i3 + 1] = (vertex1[1] + vertex2[1]) / 2;
    positionArray[(count3 * 6) + i3 + 2] = (vertex1[2] + vertex2[2]) / 2;

    normalArray[(count3 * 6) + i3] = (normal1[0] + normal2[0]) / 2;
    normalArray[(count3 * 6) + i3 + 1] = (normal1[1] + normal2[1]) / 2;
    normalArray[(count3 * 6) + i3 + 2] = (normal1[2] + normal2[2]) / 2;

    var round = Math.pow(10, 6);
    UVArray[(count3 * 4) + i2] = (Math.round((uv1[0] + uv2[0]) * round) / round) / 2;
    UVArray[(count3 * 4) + i2 + 1] = (Math.round((uv1[1] + uv2[1]) * round) / round) / 2;
}


function compileJSON() {
    var container;
    if (container = document.getElementById("root")) {
        var jsonString = ["{"];
        jsonString.push('"model_type": "' + modelType + '"');
        jsonString.push(',');
        jsonString.push('"model_uri": "' + container.getAttribute("model_uri") + '"');
        jsonString.push(',');
        jsonString.push('"model_def_uri": "' + container.getAttribute("model_def_uri") + '"');
        jsonString.push(',');

        ///GET MODEL JSON
        if (modelType === "upload") {
            var currentSurfaces = [];
            surfaces.forEach((surface, index) => {
                currentSurfaces.push(surface.geometry);
                surface.geometry = og_surfaces[index];
            });

            jsonString.push('"model_json": ' + JSON.stringify(group_root.toJSON()));
            jsonString.push(',');

            surfaces.forEach((surface, index) => {
                surface.geometry = currentSurfaces[index];
            });
            currentSurfaces = null;
        }
        else {
            jsonString.push('"model_json": {}');
            jsonString.push(',');
        }


        jsonString.push('"scaleFactor": ' + scaleFactor);
        jsonString.push(',');
        jsonString.push('"translateFactor": ' + JSON.stringify(translateFactor));
        jsonString.push(',');
        jsonString.push('"mode": "' + viewerMode + '"');
        jsonString.push(',');
        jsonString.push('"color": "' + colorMaterial.color.getHexString() + '"');
        jsonString.push(',');
        jsonString.push('"surfaces": [');
        surfaces.forEach((surface, index) => {
            jsonString.push(JSON.stringify({
                "image": referenceImages[index],
                "material": surfaceMaterials[index].toJSON(),
                "scale": scaleState[index],
                "resolution": lodState[index],
                "reference": refType[index],
                "state": surfaceState[index]
            }));
            //console.log(surfaceMaterials[index]);
            if (index != surfaces.length - 1) jsonString.push(',');
        });
        jsonString.push(']');
        jsonString.push('}');
    }
    return jsonString.join("");
}

function downloadJSON() {
    if (group_root) {
        var result = compileJSON();

        var blob = new Blob([result], { type: 'application/octet-stream' });
        saveAs(blob, "model" + '.json');
        return true;
    }
    else return false;
}


function loadJSON(json) {

    return new Promise((resolve, reject) => {
        

        if (group_root) resetScene();

        var surfaceList = [];
        var matLoader = new THREE.MaterialLoader();
        var imageLoader = new THREE.ImageLoader();


        //console.log(json);
        if (json.model_type === "upload") {

            var surfaceCount = 0, modelCount = 0;

            //Shared Materials
            colorMaterial = new THREE.MeshPhongMaterial({
                bumpScale: 1,
                specular: new THREE.Color(0.1 * 0.2, 0.1 * 0.2, 0.1 * 0.2),
                reflectivity: 0.1,
                shininess: 30
            });
            wireMaterial = new THREE.MeshBasicMaterial({
                wireframe: true
            });

            var color = parseInt(json.color, 16);
            colorMaterial.color.set(color);
            wireMaterial.color.set(color);

            var loader = new THREE.ObjectLoader();
            var object = loader.parse(json.model_json);

            group_root = object;

            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {

                    if (MODEL_ID.includes(child.name)) {
                        //We deal with static model reference storage
                        models.push(child);
                        models_map[child.name] = modelCount;
                        modelCount++;

                        child.material.dispose();
                        child.material = colorMaterial;
                    }
                    else {

                        var vertexNumber = child.geometry.getAttribute("position").count;

                        for (var medAmount = 0; ; medAmount++) {
                            if (vertexNumber * Math.pow(2, medAmount) >= MIN_MED_THRESHOLD)
                                break;
                        }

                        surfaces.push(child);
                        surfaceList.push({name: child.name, med: medAmount});

                        child.material.dispose();
                        child.material = colorMaterial;

                        og_surfaces.push(child.geometry.clone());
                        curr_surfaces.push(child.geometry.clone());

                        surfaceMaterials.push(null);

                        //We deal with customizable surface reference storage
                        textures.push(null);
                        referenceImages.push(null);

                        surfaces_map[child.name] = surfaceCount;

                        lodState.push(0);
                        scaleState.push(0);
                        surfaceState.push(true);
                        refType.push(REF_TYPE.POSITIVE);

                        surfaceCount++;
                    }
                }
            });
            scene.add(object);

        }
        else {
            loadModel(json.model_uri, json.model_type, json.color).then(list => {
                surfaceList = list;
            });
        }

        //Set app parameters.
        container.setAttribute("model_uri", json.model_uri);
        container.setAttribute("model_def_uri", json.model_def_uri);
        //container.setAttribute("model_type", json.model_type);

        surfaces.forEach((_, index) => {
            //Initialize texture material unique to each surface
            //Oh god why is this this obtuse and annoying.
            imageLoader.load(json.surfaces[index].material.images[0].url, function (image) {

                var texture = new THREE.Texture(image);
                var textureJSON = json.surfaces[index].material.textures[0];
                texture.image = image;
                texture.center.set(textureJSON.center[0], textureJSON.center[1]);
                texture.flipY = textureJSON.flipY;
                texture.offset.set(textureJSON.offset[0], textureJSON.offset[1]);
                texture.rotation = textureJSON.rotation;
                texture.wrapS = textureJSON.wrap[0];
                texture.wrapT = textureJSON.wrap[1];
                texture.repeat.set(textureJSON.repeat[0], textureJSON.repeat[1]);
                texture.minFilter = textureJSON.minFilter;

                console.log(json);
                console.log(texture);

                var texs = [];
                texs[json.surfaces[index].material.textures[0].uuid] = texture;

                matLoader.setTextures(texs);
                var material = matLoader.parse(json.surfaces[index].material);
                material.needsUpdate = true;
                surfaceMaterials[index] = material;

                //We deal with customizable surface reference storage
                textures[index] = texture;
                referenceImages[index] = json.surfaces[index].image;

                updateSurface(index, json.surfaces[index].resolution, json.surfaces[index].scale).then(r => {
                    changeReferenceType(index, json.surfaces[index].reference, json.surfaces[index].scale).then(r => {
                        changeReferencePosition(index, -textures[index].offset.x*100, -textures[index].offset.y*100, textures[index].repeat.x*100, textures[index].repeat.y*100, textures[index].rotation, scaleState[index]).then(r => {
                            
                            changeReferenceState(index, json.surfaces[index].state, json.surfaces[index].scale);
                            changeViewMode(json.mode);

                        });
                    });
                });

            });
        });

        scaleFactor = json.scaleFactor;
        translateFactor = json.translateFactor;
        modelType = json.model_type;

        ///console.log("!");
        surfaceList.forEach((surfaceDetail, index) => {
            surfaceDetail["transX"] = json.surfaces[index].material.textures[0].offset[0]*100;
            surfaceDetail["transY"] = json.surfaces[index].material.textures[0].offset[1]*100;
            surfaceDetail["scaleX"] = json.surfaces[index].material.textures[0].repeat[0]*100;
            surfaceDetail["scaleY"] = json.surfaces[index].material.textures[0].repeat[1]*100;
            surfaceDetail["rotation"] = json.surfaces[index].material.textures[0].rotation;
            surfaceDetail["extrusion"] = json.surfaces[index].scale;
            surfaceDetail["resolution"] = json.surfaces[index].resolution;
            surfaceDetail["reference"] = json.surfaces[index].reference;
            surfaceDetail["state"] = json.surfaces[index].state;
            surfaceDetail["img_url"] = json.surfaces[index].material.images[0].url;
        });

        resolve(surfaceList);

    });
}