//Scene/Model variables
var container, camera, controls, scene, renderer1;
var hasMesh = false;
var manager = new THREE.LoadingManager();
var faces_structure = [];
var helper;

//Image Variables
var image_width, image_height, texturesImage = [], imgNaturalW, imgNaturalH, currentImage, oCanvas;

//Model
var model_mesh;
var model, textures = [];
var old_vertices, old_faces, old_uvs, old_normals, old_uvs_face, groups;

var spotLight, lightHelper, floorMesh;

var model_info = {};
var model_uri = "";
var model_info_uri = "";
var model_param = {};

function loadModel() {
	model_info_uri = document.getElementById("root").getAttribute('model_info_uri');
	model_uri = document.getElementById("root").getAttribute('model_uri');
	
	return fetch(model_info_uri)
		 .then(response => response.json())
		 .then(data => {
			 //TODO: Validate JSON
			 model_info = data;
			 
			 resetTextures();
			 model_param = {
                        modelSelected: model_uri,
						numberFaces: model_info.face_number, 
                        imageMappings: [...Array(data.face_number).keys()].map(item => ({ index: item, img: './img/'+(item+1)+'.png', enabled: false })),
                        scaleValues: [...Array(data.face_number).keys()].map(i => (data.faces[i].max_extrude)),
                        resolutionValues: [...Array(data.face_number).keys()].map(i => 0),
                        textureBounds: [1, 0, 1, 0],
                        isUpdate: false,
                        wireframeView: false,
                        textureView: false,
                        color: '#FCB900'
                    };
			 
			 loadTextures(model_param.imageMappings);
			 loadObject(model_param);
			return {info: model_info, settings: model_param};
		   })
		 .catch((error) => {
			 console.error(error);
		   });
}

function updateModel(model_settings, color, wireframeView, textureView){
	
	 model_param = {
                        modelSelected: model_uri,
						numberFaces: model_info.face_number, 
                        imageMappings: [...Array(model_info.face_number).keys()].map(item => ({ index: item, img: './img/'+(item+1)+'.png', enabled: false })),
                        scaleValues: model_settings.scaleValues,
                        resolutionValues: model_settings.resolutionValues,
                        textureBounds: [1, 0, 1, 0],
                        isUpdate: model_settings.isUpdate,
                        wireframeView: wireframeView,
                        textureView: textureView,
                        color: color
                    };
					
	return new Promise((resolve, reject) => {			
		var imgCreationTasks = [];
		model_settings.imageMappings.forEach( (image, index) => {
			
			if(image.img !== model_param.imageMappings[index].img){
				
				imgCreationTasks.push(createImg(image.img, index, "in"));
				//TODO: Orientation is a case in need of attention.
			}
		});
		
		Promise.all(imgCreationTasks)
		.then((results)=>{
			model_param.imageMappings = model_settings.imageMappings;
			
			//resetTextures();
			loadTextures(model_param.imageMappings);
			createGeometry(model_param);
			resolve(true);
		});
	});
}


/** ___________Create Scene Functions_________ */
function createScene() {

    container = document.getElementById('viewer');

    /**________Camara ______________*/

    camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 1, 1000);
    camera.up.set(0, 1, 0);
    camera.position.set(300, 20, 0);
    camera.add(new THREE.PointLight(0xffffff, 0.8));

    /** ___________SCENE___________ */

    scene = new THREE.Scene();
    scene.add(camera);

    helper = new THREE.GridHelper(260, 20, 0xFF5555, 0xF0F0F0);
    helper.position.y = -40;
    scene.add(helper);

    renderer1 = new THREE.WebGLRenderer( { alpha: true } );
    //renderer1.setClearColor(0xffffff);
    renderer1.setPixelRatio(window.devicePixelRatio);
    renderer1.setSize(container.clientWidth, container.clientHeight);
    renderer1.shadowMap.enabled = true;
    renderer1.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer1.domElement);

    /*_____CONTROLS________*/
    var controls = new THREE.OrbitControls(camera, renderer1.domElement);
    controls.addEventListener('change', render);
    controls.target.set(0, 1.2, 2);
    controls.update();

    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function onWindowResize() {
    camera.aspect = (container.clientWidth) / (container.clientHeight);
    camera.updateProjectionMatrix();
    renderer1.setSize(container.clientWidth, container.clientHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    camera.lookAt(scene.position);
    renderer1.render(scene, camera);
}

function createLights(lights, update, intensity) {

    if (lights) {
        scene.remove(helper);
        renderer1.setClearColor(0x000000);

        if (!update) {
            spotLight = new THREE.SpotLight(0xffffff, 1);
            spotLight.name = 'spotLight';
            spotLight.position.set(5, 5, 10);
            spotLight.angle = Math.PI / 4;
            spotLight.penumbra = 0.05;
            spotLight.decay = 1;
            spotLight.distance = 200;
            spotLight.castShadow = true;
            spotLight.shadow.mapSize.width = 1024;
            spotLight.shadow.mapSize.height = 1024;
            spotLight.shadow.camera.near = 10;
            spotLight.shadow.camera.far = 100;
            spotLight.intensity = intensity;
            scene.add(spotLight);

            lightHelper = new THREE.SpotLightHelper(spotLight);
            scene.add(lightHelper);

            var material = new THREE.MeshPhongMaterial({ color: 0x808080, dithering: true });
            var geometry = new THREE.PlaneBufferGeometry(2000, 2000);
            floorMesh = new THREE.Mesh(geometry, material);
            floorMesh.position.set(0, - 1, 0);
            floorMesh.rotation.x = - Math.PI * 0.5;
            floorMesh.receiveShadow = true;
            scene.add(floorMesh);
        } else {
            scene.getObjectByName('spotLight').intensity = intensity;
        }
    }
    else {
        renderer1.setClearColor(0xffffff);
        scene.remove(spotLight);
        scene.remove(lightHelper);
        scene.remove(floorMesh);
        helper = new THREE.GridHelper(60, 60, 0xFF4444, 0x404040);
        helper.position.y = -0.7;
        scene.add(helper);
    }
}

/** ___________Interface Functions ____________*/

function downloadOBJ(x, y, z, change) {

    if (change) {
        var scene2 = new THREE.Scene();
        var group = new THREE.Group();
        var geo = new THREE.Geometry().fromBufferGeometry(scene.getObjectByName('group').children[0].geometry._bufferGeometry);
        geo = geo.scale(0.02 * x, 0.02 * y, 0.02 * z);
        var mesh = new THREE.Mesh(geo);
        group.add(mesh);
        scene2.add(group);

        var exporter = new THREE.OBJExporter();
        var result = exporter.parse(scene2);
    }
    else {
        var exporter = new THREE.OBJExporter();
        var result = exporter.parse(scene);
    }

    var blob = new Blob([result], { type: 'application/octet-stream' });
    saveAs(blob, "model" + '.obj');
    return true;
}

/** ___________Image Functions_________________*/

function createImg(file, index, orientation) {
	return new Promise((resolve, reject) => {
	
		let updateDimensions = false;
		if (!currentImage || file !== currentImage.src) {
			updateDimensions = true;
		}
		currentImage = new Image();
		currentImage.addEventListener("load", function() {
			if (updateDimensions) {
				imgNaturalW = currentImage.naturalWidth;
				imgNaturalH = currentImage.naturalHeight;
			}
			oCanvas = document.createElement("Canvas");
			oCanvas.width = imgNaturalW;
			oCanvas.height = imgNaturalH;
			oCanvas.getContext('2d').drawImage(currentImage, 0, 0, oCanvas.width, oCanvas.height);
			processImage({ img: currentImage, index: index }, orientation, oCanvas)
			.then((ti) => {resolve(ti)});
		});
		currentImage.src = file;
	});
}

function processImage(data, orientation, oCanvas) {
	return new Promise((resolve, reject) => {
    let oImgData = null;
    var ori = orientation === "in" ? -1 : 1;
	
	// oImgData points to the image metadata including each pixel value
    if (imgNaturalW > imgNaturalH) {
        var newHeight = (imgNaturalH / imgNaturalW) * oCanvas.width;
        var newWidth = (imgNaturalH / imgNaturalW) * oCanvas.height;
        oImgData = oCanvas.getContext('2d').getImageData(-10, -20, newWidth * 3, newHeight / 1.2);
    }
    else if (imgNaturalW < imgNaturalH) {
        var newHeight = (imgNaturalH / imgNaturalW) * oCanvas.height;
        var newWidth = (imgNaturalH / imgNaturalW) * oCanvas.width;
        oImgData = oCanvas.getContext('2d').getImageData(-70, -10, newWidth * 1.3, newHeight / 1.2);
    }
    else {
        var newHeight = (imgNaturalH / imgNaturalW) * oCanvas.height;
        var newWidth = (imgNaturalH / imgNaturalW) * oCanvas.width;
        oImgData = oCanvas.getContext('2d').getImageData(0, 0, newWidth, newHeight);
    }

    var heightData = new Float32Array(oImgData.data.length / 4);

    var image_pixel_offset = 0; // current image pixel being processed
    var height_pixel_index = 0; // current position in the height data

    for (var y = 0; y < oImgData.height; y++) {
        for (var x = 0; x < oImgData.width; x++) {
            height_pixel_index++;
            image_pixel_offset = (y * 4) * oImgData.width + x * 4;

            // create negative monochrome value from red, green and blue values
            var avg = (oImgData.data[image_pixel_offset] + oImgData.data[image_pixel_offset + 1] + oImgData.data[image_pixel_offset + 2]) / 3;

            heightData[height_pixel_index] = ori * (avg / 255); // store scaled value in height array

            // store scaled value in height array
            oImgData.data[image_pixel_offset] = avg;
            oImgData.data[image_pixel_offset + 1] = avg;
            oImgData.data[image_pixel_offset + 2] = avg;
        }
    }
    texturesImage.push({ index: data.index, data: heightData });
    image_width = oImgData.width;
    image_height = oImgData.height;
    oCanvas.getContext('2d').putImageData(oImgData, 0, 0, 0, 0, oImgData.width, oImgData.height);
	resolve(texturesImage);
	});
}

function createDepthMap(img) {

    var blurmap = [];
    var oCanvas2 = document.createElement("Canvas");
    oCanvas2.style.width = '150px';
    oCanvas2.style.height = '150px';
    var images = document.getElementById('images');
    images.appendChild(oCanvas2);

    var sigmaA = 8;
    var sigmaB = 10;
    var sigmaMax = Math.max(sigmaA, sigmaB);
    var fsz = new cv.Size(sigmaMax + 1, sigmaMax + 1);
    let src = cv.imread(img);
    cv.cvtColor(src, src, cv.COLOR_RGB2GRAY, 0);

    let kernelA = new cv.Mat();
    let kernelB = new cv.Mat();

    cv.GaussianBlur(src, kernelA, fsz, sigmaA, 0, cv.BORDER_DEFAULT);
    cv.GaussianBlur(src, kernelB, fsz, 0, sigmaB, cv.BORDER_DEFAULT);

    //Detph Map Start
    for (var i = 0; i < src.data.length; i++) {
        var R1 = ((kernelA.data[i] / src.data[i]) - 1) * kernelB.data[i];
        var R2 = kernelA.data[i] - kernelB.data[i];

        var R = R1 / R2;

        blurmap[i] = (sigmaA * sigmaB) / ((sigmaB - sigmaA) * R + sigmaB);
    }

    //cv.imshow(oCanvas2, view);
    src.delete(); kernelB.delete(); kernelA.delete();
    //Depth map End

    return blurmap;
}

/** ___________Progress Functions _____________*/
function resetTextures() {
    texturesImage = [];
}

function loadTextures(mappingImages) {
    var onProgress = function (xhr) { };
    var onError = function (xhr) { };
    var textureLoader = new THREE.TextureLoader(manager);
    textures = [];

    for (var i = 0; i < mappingImages.length; i++) {
        var texture = textureLoader.load(mappingImages[i].img);
        texture.minFilter = THREE.LinearFilter;
        textures.push(texture);
    }
}

function loadObject(params) {

    return new Promise((resolve, reject) => {

		if (hasMesh)
            scene.remove(model_mesh);

        /*_____Load object________*/
        var onProgress = function (xhr) { };
        var onError = function (xhr) { reject() };

        var loader = new THREE.OBJLoader(manager);
        loader.load(params.modelSelected, function (object) {
            object.name = 'group';
            model_mesh = object;
            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    var geo_aux = new THREE.Geometry().fromBufferGeometry(child.geometry);
                    geo_aux.normalize();
                    child.geometry = new THREE.BufferGeometry().fromGeometry(geo_aux);
                    child.geometry.scale(50, 50, 50);
                    child.geometry.computeBoundingBox();
                    model = child;
					
                    createGeometry(model_param);
                    resolve(model.geometry.groups.length);
                }
            });
        }, onProgress, onError);
    })
}

/** ___________Create Geometry Functions_________*/
function createGeometry(params) {
	
    if (!params.isUpdate) {
        var vertices_normals = getOldValues(model.geometry.attributes.position.array, model.geometry.attributes.normal.array, model.geometry.attributes.uv.array, params.textureBounds);
        var vertices = vertices_normals.vertices;
        var normals = vertices_normals.normals;
        var uvs = vertices_normals.uvs;

        old_vertices = [], old_faces = [], old_uvs = [], old_normals = [], old_uvs_face = [];
        applyFilter(vertices, uvs, params.textureBounds);
        groups = getFaces(vertices, model.geometry.groups, normals, params.numberFaces, uvs, params.resolutionValues);
        repositionVertex();

        if (params.numberFaces !== 6) {
            // save other faces
            getOtherFaces(vertices, params.numberFaces, model.geometry.groups, uvs, normals);
        }
    }
    var materials = [];
    if (params.wireframeView) {
        var meshMaterial = new THREE.MeshPhongMaterial({
            color: params.color,
            wireframe: params.wireframeView
        });
    }
    else {
        var meshMaterial = new THREE.MeshPhongMaterial({
            bumpScale: 1,
            color: params.color,
            specular: new THREE.Color(0.1 * 0.2, 0.1 * 0.2, 0.1 * 0.2),
            reflectivity: 0.1,
            shininess: 30
        });
    }
	
    materials.push(meshMaterial);
    textures.forEach(texture => {
        var map1 = new THREE.MeshBasicMaterial({ map: texture });
        materials.push(map1);
    })


    /** Geometry */
    var geometry = new THREE.Geometry();
    geometry.vertices = texturesImage.length > 0 ? applyTexture(params.scaleValues) : old_vertices;
	
    var pos = 0;
    for (var i = 0; i < groups.length; i++) {
        for (var f = 0; f < groups[i].faces.length; f++) {
            old_faces[pos + f].materialIndex = params.textureView ? (params.imageMappings[i] ? params.imageMappings[i].index + 1 : 0) : 0;
        }
        pos += groups[i].faces.length;
    }
    geometry.faces = old_faces;
    geometry.faceVertexUvs[0] = old_uvs_face;
    geometry.computeFaceNormals();
    geometry.uvsNeedUpdate = true;
    geometry.elementsNeedUpdate = true;
    geometry.verticesNeedUpdate = true;
    geometry.normalsNeedUpdate = true;
    geometry.computeBoundingBox();

    var mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    model_mesh.children[0] = mesh;
    if (!params.isUpdate) {
        hasMesh = true;
        scene.add(model_mesh);
    }
}

function cleanVertexs(vertices, uvs) {
    var aux = [];
    var aux2 = [];

    vertices.forEach((vertice, index) => {
        var indexV = getIndex(aux, vertice);
        if (indexV === -1) {
            aux.push(vertices);
            aux2.push(uvs[index]);
        }
    })

    old_vertices = aux;
    old_uvs = uvs;
}

function getOldValues(position, normals, uvs, textureBounds) {

    var aux = { vertices: [], uvs: [], normals: [] };
    var count = 0;
    var offset = new THREE.Vector2(0 - textureBounds[1], 0 - textureBounds[3]);
    var range = new THREE.Vector2(textureBounds[0] - textureBounds[1], textureBounds[2] - textureBounds[3]);
    var round = Math.pow(10, 6);

    for (var i = 0, j = 0; i < position.length; i += 3, j += 2) {
        var vertice = new THREE.Vector3(position[i], position[i + 1], position[i + 2]);
        var normal = new THREE.Vector3(normals[i], normals[i + 1], normals[i + 2]);
        if (count < uvs.length) {
            var x = ((Math.round(uvs[j] * round) / round) + offset.x) / range.x;
            var y = ((Math.round(uvs[j + 1] * round) / round) + offset.y) / range.y;
            var uv = new THREE.Vector2(x, y);
            aux.uvs[count] = uv;
        }
        aux.vertices[count] = vertice;
        aux.normals[count] = normal;
        count++;
    }
    return aux;
}

function applyFilter(vertices, uvs, textureBounds) {

    var count = 0;
    for (var i = 0; i < vertices.length; i++) {
        if (hasVertex(old_vertices, vertices[i]) === -1) {
            old_vertices[count] = vertices[i];
            old_uvs[count] = new THREE.Vector2(uvs[i].x, uvs[i].y);
            count++;
        }
    }
}

function getFaces(vertexs, groups, normals, numberfaces, uvss, iterations) {

    var count = 0;
    var group_aux = [];
    var vertices_clone = cloneVector3Array(old_vertices);
    var uvs_clone = cloneVector2Array(old_uvs);
    var start = 0;
    for (var g = 0; g < numberfaces; g++) {
        var faces = [];
        var normals_aux = [];
        var uvs_face = [];
        var vertices_face = [];
        var count = groups[g].start + groups[g].count;

        for (var i = groups[g].start; i < count; i += 3) {

            var index1 = getIndex(vertexs[i], vertices_clone);
            var index1_uv = getIndex(uvss[i], uvs_clone);
            index1_uv = index1_uv === -1 ? index1 : index1_uv;
            vertices_face.push(vertices_clone[index1]);

            var index2 = getIndex(vertexs[i + 1], vertices_clone);
            var index2_uv = getIndex(uvss[i + 1], uvs_clone);
            index2_uv = index2_uv === -1 ? index2 : index2_uv;
            vertices_face.push(vertices_clone[index2]);

            var index3 = getIndex(vertexs[i + 2], vertices_clone);
            var index3_uv = getIndex(uvss[i + 2], uvs_clone);
            index3_uv = index3_uv === -1 ? index3 : index3_uv;
            vertices_face.push(vertices_clone[index3]);

            var face1 = new THREE.Face3(index1, index2, index3);
            faces.push(face1);
            uvs_face.push({ a: index1_uv, b: index2_uv, c: index3_uv });
            normals_aux.push(normals[i]);
        }

        group_aux.push({
            faces: faces, normals: normals_aux, start: start, end: 0, vertices: vertices_clone,
            uvs: uvs_clone, uvs_face: uvs_face, old_uvs_face: [], vertices_face: vertices_face
        });
        //Sub Division
        loopDivision(group_aux[g], iterations[g]);
        
        group_aux[g].end = group_aux[g].vertices.length;

    }
    return group_aux;
}

function repositionVertex() {

    old_vertices = cloneVector3Array(groups[0].vertices);
    old_uvs = cloneVector2Array(groups[0].uvs);
    old_faces = cloneFace3Array(groups[0].faces);
    old_uvs_face = cloneArray(groups[0].old_uvs_face);
    old_normals = cloneVector3Array(groups[0].normals);

    var start = 0;
    for (var g = 1; g < groups.length; g++) {
        start = old_vertices.length;
        old_vertices = old_vertices.concat(groups[g].vertices);
        old_uvs = old_uvs.concat(groups[g].uvs);
        old_normals = old_normals.concat(groups[g].normals);

        var pos = old_faces.length;
        old_faces = old_faces.concat(groups[g].faces);
        for (var f = 0; f < groups[g].faces.length; f++) {

            old_faces[pos + f].a = start + groups[g].faces[f].a;
            old_faces[pos + f].b = start + groups[g].faces[f].b;
            old_faces[pos + f].c = start + groups[g].faces[f].c;
        }

        old_uvs_face = old_uvs_face.concat(groups[g].old_uvs_face);
    }
}

function getOtherFaces(vertices, numberfaces, groups, uvs, normals) {

    var count = 0;
    for (var g = numberfaces; g < groups.length; g++) {
        count += groups[g].count;
    }

    var verticeCount = old_vertices.length;
    for (var i = groups[numberfaces - 1].start; i < groups[numberfaces - 1].start + count; i += 3) {
        var index1 = getIndex(vertices[i], old_vertices);
        var index2 = getIndex(vertices[i + 1], old_vertices);
        var index3 = getIndex(vertices[i + 2], old_vertices);

        if (index1 === -1) {
            old_vertices.push(vertices[i]);
            old_uvs.push(uvs[i]);
            old_normals.push(normals[i]);
            index1 = verticeCount;
            verticeCount++;
        }
        if (index2 === -1) {
            old_vertices.push(vertices[i + 1]);
            old_uvs.push(uvs[i + 1]);
            old_normals.push(normals[i + 1]);
            index2 = verticeCount;
            verticeCount++;
        }
        if (index3 === -1) {
            old_vertices.push(vertices[i + 2]);
            old_normals.push(normals[i + 2]);
            old_uvs.push(uvs[i + 2]);
            index3 = verticeCount;
            verticeCount++;
        }
        var face1 = new THREE.Face3(index1, index2, index3);
        old_faces.push(face1);
        old_uvs_face.push([uvs[i], uvs[i + 1], uvs[i + 2]]);
    }
}

function applyTexture(scale) {

    var vertices_clone = cloneVector3Array(old_vertices);
    var pos = 0;
    texturesImage.forEach(texture => {
		
        if(model_param.imageMappings[texture.index].enabled){
			var group = groups[texture.index];
			var pos = 0;
			groups.forEach((group, index) => {
				if (index < texture.index) {
					pos += group.end
				}
			});
			for (var i = 0; i < group.vertices_face.length; i++) {
				var d = lookupTexture(old_uvs[pos + i].x, old_uvs[pos + i].y, image_width, image_height, texture.data);
				if(old_normals[pos + i]){//
					vertices_clone[pos + i].x += old_normals[pos + i].x * d * scale[texture.index];
					vertices_clone[pos + i].y += old_normals[pos + i].y * d * scale[texture.index];
					vertices_clone[pos + i].z += old_normals[pos + i].z * d * scale[texture.index];
				}//
				else{//
					//TODO: This neeeds fixing
					//console.log(pos + " " + i + " " + pos + i)
				}//
			}
        }
    });

    return vertices_clone;
}

/**______________Auxiliar Functions_______________ */

function loopDivision(group, iterations) {

    var count_divisions = 0;
    var uvs_face_count = 0;
    var old_faces_normals = group.normals;
    var old_uvs_face = group.old_uvs_face;
    if (iterations === 0) {
        for (var i = 0; i < group.uvs_face.length; i++) {
            group.old_uvs_face[uvs_face_count++] = [group.uvs[group.uvs_face[i].a], group.uvs[group.uvs_face[i].b], group.uvs[group.uvs_face[i].c]];
        }
    }
    else {
        while (count_divisions < iterations) {
            var new_vertexs = [];
			var new_vertexs_map = {};
            var new_faces = [];
            var new_uvs = [];
            var uvs_face = [];
            var new_normals = [];
            var new_faces_normals = [];

            var new_vertex_counter = 0;
            var new_uvs_counter = 0;
            uvs_face_count = 0;

            for (var index = 0; index < group.faces.length; index++) {

                //Vertexes and uvs
                var vertex1 = group.vertices[group.faces[index].a];
                var vertex2 = group.vertices[group.faces[index].b];
                var vertex3 = group.vertices[group.faces[index].c];

                var new_vertice1 = generateNewVertex(vertex1, vertex2);
                var new_vertice2 = generateNewVertex(vertex2, vertex3);
                var new_vertice3 = generateNewVertex(vertex1, vertex3);

                var uv1 = group.uvs[group.uvs_face[index].a];
                var uv2 = group.uvs[group.uvs_face[index].b];
                var uv3 = group.uvs[group.uvs_face[index].c];

                var new_uv1 = generateNewVertexUV(uv1, uv2);
                var new_uv2 = generateNewVertexUV(uv2, uv3);
                var new_uv3 = generateNewVertexUV(uv1, uv3);

                //TO DO: MEDIA DAS NORMAIS É A NORMAL DA FACE;
                var normal1 = old_faces_normals[index];
                var normal2 = old_faces_normals[index];
                var normal3 = old_faces_normals[index];

                var new_normal1 = generateNewNormal(normal1, normal2);
                var new_normal2 = generateNewNormal(normal2, normal3);
                var new_normal3 = generateNewNormal(normal1, normal3);

                /** Vetices and uvs */
                var checkIndexs = [[vertex1, -1], [new_vertice1, -1], [new_vertice3, -1], [vertex2, -1], [new_vertice2, -1], [vertex3, -1]];
                checkIndexs = checkVertexs(new_vertexs_map, checkIndexs);

                var vertex1_index = checkIndexs[0][1];
                var uv1_index;
                if (vertex1_index === -1) {
                    new_vertexs.push(vertex1);
					new_vertexs_map[vertex1.x+":"+vertex1.y+":"+vertex1.z] = new_vertex_counter;
                    vertex1_index = new_vertex_counter;
                    new_vertex_counter++;

                    new_uvs.push(uv1);
                    uv1_index = new_uvs_counter;
                    new_uvs_counter++;

                    new_normals.push(normal1);
                } else {
                    uv1_index = vertex1_index;
                    new_normals[vertex1_index] = normal1;
                } // i


                var new_vertice1_index = checkIndexs[1][1];
                var new_uv1_index;
                if (new_vertice1_index === -1) {
                    new_vertexs.push(new_vertice1);
					new_vertexs_map[new_vertice1.x+":"+new_vertice1.y+":"+new_vertice1.z] = new_vertex_counter;
                    new_vertice1_index = new_vertex_counter;
                    new_vertex_counter++;

                    new_uvs.push(new_uv1);
                    new_uv1_index = new_uvs_counter;
                    new_uvs_counter++;

                    new_normals.push(new_normal1);
                } else {
                    new_uv1_index = new_vertice1_index;
                    new_normals[new_vertice1_index] = new_normal1
                }// i+1


                var new_vertice3_index = checkIndexs[2][1];
                var new_uv3_index;
                if (new_vertice3_index === -1) {
                    new_vertexs.push(new_vertice3);
					new_vertexs_map[new_vertice3.x+":"+new_vertice3.y+":"+new_vertice3.z] = new_vertex_counter;
                    new_vertice3_index = new_vertex_counter;
                    new_vertex_counter++;

                    new_uvs.push(new_uv3);
                    new_uv3_index = new_uvs_counter;
                    new_uvs_counter++;

                    new_normals.push(new_normal3);
                } else {
                    new_uv3_index = new_vertice3_index;
                    new_normals[new_vertice3_index] = new_normal3
                } // i+2*/

                var vertex2_index = checkIndexs[3][1];
                var uv2_index;
                if (vertex2_index === -1) {
                    new_vertexs.push(vertex2);
					new_vertexs_map[vertex2.x+":"+vertex2.y+":"+vertex2.z] = new_vertex_counter;
                    vertex2_index = new_vertex_counter;
                    new_vertex_counter++;

                    new_uvs.push(uv2);
                    uv2_index = new_uvs_counter;
                    new_uvs_counter++;

                    new_normals.push(normal2);
                } else {
                    uv2_index = vertex2_index;
                    new_normals[vertex2_index] = normal2
                } // i+3

                var new_vertice2_index = checkIndexs[4][1];
                var new_uv2_index;
                if (new_vertice2_index === -1) {
                    new_vertexs.push(new_vertice2);
					new_vertexs_map[new_vertice2.x+":"+new_vertice2.y+":"+new_vertice2.z] = new_vertex_counter;
                    new_vertice2_index = new_vertex_counter;
                    new_vertex_counter++;

                    new_uvs.push(new_uv2);
                    new_uv2_index = new_uvs_counter;
                    new_uvs_counter++;

                    new_normals.push(new_normal2);
                } else {
                    new_uv2_index = new_vertice2_index;
                    new_normals[new_vertice2_index] = new_normal2
                }

                var vertex3_index = checkIndexs[5][1];
                var uv3_index;
                if (vertex3_index === -1) {
                    new_vertexs.push(vertex3);
					new_vertexs_map[vertex3.x+":"+vertex3.y+":"+vertex3.z] = new_vertex_counter;
                    vertex3_index = new_vertex_counter;
                    new_vertex_counter++;

                    new_uvs.push(uv3);
                    uv3_index = new_uvs_counter;
                    new_uvs_counter++;

                    new_normals.push(normal3);

                } else {
                    uv3_index = vertex3_index;
                    new_normals[vertex3_index] = normal3
                }

                // Faces 
                var face1 = new THREE.Face3(vertex1_index, new_vertice1_index, new_vertice3_index);
                new_faces_normals.push(normal1);
                new_faces.push(face1);
                uvs_face.push({ a: uv1_index, b: new_uv1_index, c: new_uv3_index });
                old_uvs_face[uvs_face_count++] = [new_uvs[uv1_index], new_uvs[new_uv1_index], new_uvs[new_uv3_index]];

                var face2 = new THREE.Face3(new_vertice1_index, vertex2_index, new_vertice2_index);
                new_faces_normals.push(new_normal1);
                new_faces.push(face2);
                uvs_face.push({ a: new_uv1_index, b: uv2_index, c: new_uv2_index });
                old_uvs_face[uvs_face_count++] = [new_uvs[new_uv1_index], new_uvs[uv2_index], new_uvs[new_uv2_index]];

                var face3 = new THREE.Face3(new_vertice2_index, vertex3_index, new_vertice3_index);
                new_faces_normals.push(new_normal2);
                new_faces.push(face3);
                uvs_face.push({ a: new_uv2_index, b: uv3_index, c: new_uv3_index });
                old_uvs_face[uvs_face_count++] = [new_uvs[new_uv2_index], new_uvs[uv3_index], new_uvs[new_uv3_index]];

                var face4 = new THREE.Face3(new_vertice1_index, new_vertice2_index, new_vertice3_index);
                new_faces_normals.push(new_normal3);
                new_faces.push(face4);
                uvs_face.push({ a: new_uv1_index, b: new_uv2_index, c: new_uv3_index });
                old_uvs_face[uvs_face_count++] = [new_uvs[new_uv1_index], new_uvs[new_uv2_index], new_uvs[new_uv3_index]];

            }
            group.vertices_face = new_vertexs;
            group.vertices = new_vertexs;
            group.faces = new_faces;
            group.uvs = new_uvs;
            group.uvs_face = uvs_face;
            group.normals = new_normals;
            group.old_uvs_face = old_uvs_face;
            old_faces_normals = new_faces_normals;
            count_divisions++;
        }
    }
}

function generateNewVertex(vertex1, vertex2) {

    var x1 = vertex1.x !== vertex2.x ? (vertex1.x + vertex2.x) / 2 : vertex1.x;
    var y1 = vertex1.y !== vertex2.y ? (vertex1.y + vertex2.y) / 2 : vertex1.y;
    var z1 = vertex1.z !== vertex2.z ? (vertex1.z + vertex2.z) / 2 : vertex1.z;
    return new THREE.Vector3(x1, y1, z1);
}

function generateNewVertexUV(uv1, uv2) {

    var round = Math.pow(10, 6);
    var u = (Math.round((uv1.x + uv2.x) * round) / round) / 2;
    var v = (Math.round((uv1.y + uv2.y) * round) / round) / 2;
    return new THREE.Vector2(u, v);
}

function generateNewNormal(normal1, normal2) {

    if (normal1.x !== normal2.x && normal1.y !== normal2.y && normal1.z !== normal2.z) {
        var x1 = (normal1.x + normal2.x) / 2;
        var y1 = (normal1.y + normal2.y) / 2;
        var z1 = (normal1.z + normal2.z) / 2;
        return new THREE.Vector3(x1, y1, z1);
    }
    else {
        return normal1;
    }
}

function getIndex(vertex, vertices) {
    var index = -1;
    for (var i = 0; i < vertices.length; i++) {
        if (vertices[i].x === vertex.x && vertices[i].y === vertex.y && vertices[i].z === vertex.z) {
            index = i;
            break;
        }
    }
    return index;
}

function lookupTexture(u, v, width, height, data) {

    var iu = Math.round(u * (width - 1));
    var iv = Math.round(v * (height - 1));

    var offeset = ((height - 1) - iv) * width + iu;
    return data[offeset];
}

function cloneArray(source) {
    let result = Object.assign([], [], source);
    for (var i = 0; i < source.length; i++) {
        result[i] = Object.assign([], [], source[i]);
    }
    return result;
}

function cloneVector3Array(source) {
    let result = Object.assign([], [], source);
    for (var i = 0; i < source.length; i++) {
        result[i] = Object.assign(new THREE.Vector3, new THREE.Vector3, source[i]);
    }
    return result;
}

function cloneVector2Array(source) {
    let result = Object.assign([], [], source);
    for (var i = 0; i < source.length; i++) {
        result[i] = Object.assign(new THREE.Vector2, new THREE.Vector2, source[i]);
    }
    return result;
}

function cloneFace3Array(source) {
    let result = Object.assign([], [], source);
    for (var i = 0; i < source.length; i++) {
        result[i] = Object.assign(new THREE.Face3, new THREE.Face3, source[i]);
    }
    return result;
}

function hasVertex(array, vertice) {
    var exists = -1;
    for (var i = 0; i < array.length; i++) {
        if (array[i].x === vertice.x && array[i].y === vertice.y && array[i].z === vertice.z) {
            exists = i;
            break;
        }
    }
    return exists;
}

function checkVertexs(vertices, new_vertices) {

	for (var j = 0; j < new_vertices.length; j++) {
            if (new_vertices[j][1] === -1 && new_vertices[j][0].x+":"+new_vertices[j][0].y+":"+new_vertices[j][0].z in vertices) {
				new_vertices[j][1] = vertices[new_vertices[j][0].x+":"+new_vertices[j][0].y+":"+new_vertices[j][0].z];
            }
        }
		
    return new_vertices;
}
