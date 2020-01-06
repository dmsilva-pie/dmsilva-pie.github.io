/* 
 * *
 * * Litho 3D customization tool v1.8.0
 * *
 * * Aplication for the customization and visualization of 3D models.
 * * Using reference images, it facilitates model personalization.
 * *
 *
 * @author Diogo Mil-Homens da Silva
 * 
 * University NOVA - School of Science and Technology
 * Department of Computer Science
 * 
 * For inquiries: dm-.silva@campus.fct.unl
 *
 */

'use strict';

//import * as THREE from 'three';

//import { OrbitControls } from './threejs/examples/jsm/controls/OrbitControls.js';
//import { OBJLoader } from './threejs/examples/jsm/loaders/OBJLoader.js';
//import { STLLoader } from './threejs/examples/jsm/loaders/STLLoader.js';
//import { GLTFLoader } from './threejs/examples/jsm/loaders/GLTFLoader.js';
//import { OBJExporter } from './threejs/examples/jsm/exporters/OBJExporter.js';
//import { STLExporter } from './threejs/examples/jsm/exporters/STLExporter.js';
//import { GLTFExporter } from './threejs/examples/jsm/exporters/GLTFExporter.js';
//import { BufferGeometryUtils } from './threejs/examples/jsm/utils/BufferGeometryUtils.js';
//import { saveAs } from 'file-saver';
//import { JSZip } from 'jszip';

var LITHO3D = (function () {

    /** Variables */

    /* Scene variables */
    var container, scene, renderer, camera, controls, helper;
    var manager = new THREE.LoadingManager();
    var textureLoader = new THREE.TextureLoader(manager);
    var imageLoader = new THREE.ImageLoader(manager);

    /* Model/Mesh/Geometry variables */
    var modelType = "";
    var modelFormat = "";

    var group_root = null;
    var models = [], models_map = {},
        surfaces = [], surfaces_map = {},
        og_surfaces = [], curr_surfaces = [],
        og_surface_borders = [], curr_surface_borders = [],
        curr_sharp_vertex = [], surfaceAspectRatios = [];

    var scaleFactor = 1; //How much scaling to normalize mesh size.
    var translateFactor = { x: 0, y: 0, z: 0 }; //How much translation to center objects.

    /* Materials/Textures */
    var colorMaterial, wireMaterial;
    var surfaceMaterials = [];
    var textures = [];

    /* State variables */
    var currentColor = "#F4F4F4";
    var viewerMode = "color";
    var positionState = [];
    var surfaceState = [];
    var referenceImages = [];
    var refType = [];
    var lodState = [];
    var scaleState = [];

    /* FPS control */
    var clock = null;
    var delta = 0;
    var interval = 1 / 30;

    /* Asset URLs */
    var modelURL = "";
    var jsonURL = "";
    var imageURLs = [];

    /* Reusable orkers */
    var tesselationWorker = window.Worker ? new Worker('./libs/tesselateWorker.js') : null;


    /** Constants */

    //Placeholder image base path
    const PLACEHOLDER_BASE_PATH = "https://dmsilva-pie.github.io/build/img/";

    //Placeholder image base path
    const PLACEHOLDER_MAX_INDEX = 6;

    //Any mesh with this id/name is considered static, preventing customization.
    const MODEL_ID = ["base", "model", "exclude", "ignore"];

    //Default scaling of model (x,y,z)
    const SCALE_UNIFORM = [50, 50, 50];

    //Reference types
    const REF_TYPE = Object.freeze({
        POSITIVE: "positive",
        NEGATIVE: "negative"
    });
    //Model origin types
    const MODELTYPES = Object.freeze({
        UPLOAD: "upload", // Uploaded by user
        PREMADE: "premade", // Premade as product
        RECONSTRUCT: "reconstruction" // Premade as 3D reconstruction base
    });
    //Viewer modes
    const VIEWMODES = Object.freeze({
        WIREFRAME: "wireframe",
        TEXTURE: "texture",
        COLOR: "color"
    });

    //Minimum desired vertice count on medium detail setting of tesselation.
    const MIN_MED_THRESHOLD = 131072 * 2;

    const IS_MOBILE = (/Mobi|Android/i.test(navigator.userAgent));

    /*** SETUP METHODS ***/

    /**
     * Creates the 3D scene on a HTML container. If not specified, uses the one with 'viewer' as id.
     * @param {HTMLElement} container The container in which to render the scene.
     */
    function createScene(container = null, limitMobileFPS = true) {

        if (scene != null)
            return;
        if (container === null || !(container instanceof HTMLDocument))
            container = document.getElementById('viewer');
        if (container === null)
            return;

        //Camera
        camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 1, 1000);
        camera.up.set(0, 1, 0);
        camera.position.set(300, 20, 0);
        camera.add(new THREE.PointLight(0xffffff, 0.8));
;
        //Scene
        scene = new THREE.Scene();
        scene.add(camera);

        helper = new THREE.GridHelper(260, 20, 0xFF5555, 0xF0F0F0);
        helper.position.y = -50;
        scene.add(helper);

        var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.4 );
        directionalLight.position.set(0,1,0);
        scene.add( directionalLight );

        renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        //Controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.addEventListener('change', render);
        controls.target.set(0, 1.2, 2);
        controls.minPolarAngle = 0.05;
        controls.maxPolarAngle = 2.00;
        controls.minDistance = 60;
        controls.maxDistance = 450;
        controls.update();

        window.addEventListener('resize', onWindowResize, false);

        //For performance reasons, we can limit mobile to 30FPS if necessary.
        //Allows for smother user experience on some older devices.
        if (limitMobileFPS && IS_MOBILE) {
            clock = new THREE.Clock();
            animateMobile();
        }
        else
            animate();
    }

    function onWindowResize() {
        container = document.getElementById('viewer');
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

    /** Clears the 3D scene and deletes reference data. */
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

        imageURLs = [];
        modelURL = "";
        jsonURL = "";

        modelType = "";
        modelFormat = "";

        curr_surface_borders = [];
        og_surface_borders = [];

        surfaceAspectRatios = [];

        curr_sharp_vertex = [];

        lodState = [];
        scaleState = [];
        surfaceState = [];
        positionState = [];
        referenceImages = [];
        refType = [];

        group_root = null;
    }


    /*** API METHODS ***/

    /**
     * Loads a new model into the scene, overwriting the current one if it exists.
     * @param {string} uri The url of the model file.
     * @param {string} type The origin type of the model. Available types in [MODELTYPES] constants.
     * @param {string} color The initial solid color value in hexadecimal.
     * @returns {Array} A list with information about the customizable surfaces added to the scene.
     */
    function loadModel(uri, format, type = MODELTYPES.UPLOAD, color = '#F4F4F4') {

        return new Promise((resolve, reject) => {

            //Reset model data and scene, memory management
            if (group_root)
                resetScene();

            //Intended returned data with surface details. Used for interface initialization.
            var surfaceList = [];

            //Select apropriate loader.
            var loader = null;
            switch (format.toLowerCase()) {
                case "obj": loader = new THREE.OBJLoader(manager); break;
                case "glb": loader = new THREE.GLTFLoader(manager); break;
                default: loader = null; break;
            }
            if (loader === null) { reject(new Error("Unsupported file format.")); return; }

            var onProgress = function (xhr) { };
            var onError = function (error) { reject(error) };

            //Main 3D object/scene loading block
            loader.load(uri, function (object) {

                if (format === "glb") object = object.scene;

                object.name = 'group_root';
                group_root = object;

                //De-group geometries into separate meshes, if necessary.
                degroupMesh(object);

                var xS = null, yS = null, zS = null;
                var xL = null, yL = null, zL = null;
                var surfaceCount = 0, modelCount = 0;

                //Initialize model and state variables and find necessary factors.
                object.traverse(function (child) {
                    if (child instanceof THREE.Mesh) {

                        //Dispose of unecessary duplicate data that doesn't contribute to extrusion.
                        var indexedGeometry = THREE.BufferGeometryUtils.mergeVertices(child.geometry);
                        child.geometry.dispose();
                        smoothDuplicateVertexes(indexedGeometry);
                        child.geometry = indexedGeometry;

                        //Find normalization factor components
                        var amount = child.geometry.getAttribute('position').count;
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

                        if (MODEL_ID.includes(child.name) || child.geometry.getAttribute("uv") === null) {
                            //We deal with static model reference storage
                            models.push(child);
                            models_map[child.name] = modelCount;
                            modelCount++;
                        }
                        else {

                            //Determine medium detail level based on desired threshold
                            for (var medAmount = 0; ; medAmount++)
                                if (child.geometry.index.count / 3 * Math.pow(2, medAmount) >= MIN_MED_THRESHOLD)
                                    break;

                            //We deal with customizable surface reference storage
                            surfaces.push(child);
                            surfaces_map[child.name] = surfaceCount;
                            surfaceList.push({ name: child.name, med: medAmount });

                            //Initialize texture material unique to each surface
                            var placeholderSurfaceImage = placeholderImage(surfaceCount);
                            var texture = textureLoader.load(placeholderSurfaceImage);
                            texture.minFilter = THREE.LinearFilter;

                            var material = new THREE.MeshBasicMaterial({ map: texture });
                            surfaceMaterials.push(material);
                            textures.push(null);
                            referenceImages.push(null);

                            imageURLs.push("");

                            lodState.push(0);
                            scaleState.push(0);
                            surfaceState.push(true);
                            positionState.push([0, 0, 1, 1, 0]);
                            refType.push(REF_TYPE.POSITIVE);

                            curr_surface_borders.push(new Map());
                            og_surface_borders.push(new Map());
                            generateBorderTable(surfaceCount, child.geometry);

                            //Compute surface aspect ratio. Can be ignored for UV mapped textures/references.
                            surfaceAspectRatios.push({ w: 1, h: 1, enabled: true });
                            calculateSurfaceAspectRatio(surfaceCount, child.geometry);

                            //We find the "sharp" vertexes, aka the vertexes that share position values but difer in texture or normal info.
                            curr_sharp_vertex.push(new Map());

                            surfaceCount++;
                        }
                    }
                });

                var xM = Math.abs(xL) - ((xS + xL) / 2);
                var yM = Math.abs(yL) - ((yS + yL) / 2);
                var zM = Math.abs(zL) - ((zS + zL) / 2);
                var distM = Math.sqrt(Math.pow(xM, 2) + Math.pow(yM, 2) + Math.pow(zM, 2));

                var xm = Math.abs(xS) - ((xS + xL) / 2);
                var ym = Math.abs(yS) - ((yS + yL) / 2);
                var zm = Math.abs(zS) - ((zS + zL) / 2);
                var distm = Math.sqrt(Math.pow(xm, 2) + Math.pow(ym, 2) + Math.pow(zm, 2));

                //Normalization and scale factors
                scaleFactor = 1 / Math.max(distm, distM);
                translateFactor = { x: (xS + xL) / 2, y: (yS + yL) / 2, z: (zS + zL) / 2 };

                currentColor = color;

                //Shared Materials
                colorMaterial = new THREE.MeshPhongMaterial({
                    bumpScale: 1,
                    color: color,
                    specular: new THREE.Color(0.1 * 0.2, 0.1 * 0.2, 0.1 * 0.2),
                    reflectivity: 0.1,
                    shininess: 30
                });
                wireMaterial = new THREE.MeshPhongMaterial({
                    color: color,
                    wireframe: true
                });

                surfaceCount = 0;

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

                        //We store and maintain two separate copies of the customizable surfaces. 
                        //One is the currently used one for calculation purposes. 
                        //The other is a fallback backup that safeguards the original morphology.
                        if (!MODEL_ID.includes(child.name) && child.geometry.getAttribute("uv") !== null) {
                            findSharpVertexes(surfaceCount, child.geometry);

                            curr_surfaces.push(child.geometry.clone());
                            og_surfaces.push(child.geometry.clone());

                            surfaceCount++;
                        }
                    }
                });

                scene.add(group_root);

                group_root.materialLibraries = null;

                modelType = type;
                modelFormat = format;
                modelURL = uri;

                //If viewer mode is diferent from previous model, enforce it.
                if (viewerMode !== VIEWMODES.COLOR)
                    changeViewMode(viewerMode);

                resolve(surfaceList);

            }, onProgress, onError);
        })
    }

    function degroupMesh(object3D) {
        //Degroup 3D object into separate meshes. 
        //Certain meshes possess multiple material groups, by degrouping we can turn each into a separate editable surface.

        object3D.traverse(function (child) {
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

                        object3D.add(mesh);
                    });

                    child.geometry.dispose();
                    object3D.remove(child);
                }
            }
        });
    }

    function smoothDuplicateVertexes(geometry) {

        //Merge vertices with same position and UV data, interpolating normals.

        var positions = geometry.getAttribute("position");
        var normals = geometry.getAttribute("normal");
        var uvs = geometry.getAttribute("uv");
        var indexes = geometry.index;

        var table = new Map();

        //Build map with buckets of indexes with the same position
        for (var i = 0; i < positions.count; i++) {
            var pos = positions.array[(i * 3)] + ":" + positions.array[(i * 3) + 1] + ":" + positions.array[(i * 3) + 2];

            if (!table.has(pos))
                table.set(pos, [i]);
            else
                table.get(pos).push(i);
        }

        var replacementIndexTable = new Map();
        var newPositions = [];
        var newNormals = [];
        var newUVS = [];
        var newIndexes = new Uint32Array(indexes.count);
        var currentIndex = 0;

        table.forEach((values, key) => {

            var uvDupeTable = new Map();

            //Separate vertexes of same position by diferent UV values (maintain texture edge cases)
            values.forEach((index, key) => {

                var uv = uvs.array[(index * 2)] + ":" + uvs.array[(index * 2) + 1];

                if (!uvDupeTable.has(uv))
                    uvDupeTable.set(uv, [index]);
                else
                    uvDupeTable.get(uv).push(index);

            });

            //Interpolate duplicate position vertex normals.
            var normal = [0, 0, 0];

            values.forEach(index => {
                normal[0] += normals.array[(index * 3)];
                normal[1] += normals.array[(index * 3) + 1];
                normal[2] += normals.array[(index * 3) + 2];
            });
            normal[0] = normal[0] / values.length;
            normal[1] = normal[1] / values.length;
            normal[2] = normal[2] / values.length;

            //Construct new geometry attributes, merging vertexes with same position and UV.
            uvDupeTable.forEach((dupes, key) => {

                dupes.forEach(index => {
                    replacementIndexTable.set(index, currentIndex);
                });

                newPositions.push(positions.array[(dupes[0] * 3)], positions.array[(dupes[0] * 3) + 1], positions.array[(dupes[0] * 3) + 2]);
                newNormals.push(normal[0], normal[1], normal[2]);
                newUVS.push(uvs.array[(dupes[0] * 2)], uvs.array[(dupes[0] * 2) + 1]);
                currentIndex++;
            });

        });

        for (var i = 0; i < newIndexes.length; i++)
            newIndexes[i] = replacementIndexTable.get(indexes.array[i]);

        newPositions = Float32Array.from(newPositions);
        newNormals = Float32Array.from(newNormals);
        newUVS = Float32Array.from(newUVS);

        geometry.addAttribute("position", new THREE.BufferAttribute(newPositions, 3, false));
        geometry.addAttribute("normal", new THREE.BufferAttribute(newNormals, 3, false));
        geometry.addAttribute("uv", new THREE.BufferAttribute(newUVS, 2, false));
        geometry.setIndex(new THREE.BufferAttribute(newIndexes, 1, false));
        geometry.index.needsUpdate = true;
        geometry.needsUpdate = true;
    }

    function findSharpVertexes(index, geometry) {

        //We find all vertexes that belong to sharp edges, ie those that occupy same positions but difer in normals/uvs.
        //This is necessary to diferentiate between face group borders and surface borders.
        //It's also helpful to handle surface update special cases.

        if (!curr_sharp_vertex[index])
            return;

        //Map of vertex index -> Array[ boolean if special case, normal x, normal y, normal z, duplicate indexes...]
        curr_sharp_vertex[index] = new Map();

        var position = geometry.getAttribute("position");
        var array = position.array;

        var table = new Map();

        curr_surface_borders[index].forEach((values, i) => {
            var pos = array[(i * 3)] + ":" + array[(i * 3) + 1] + ":" + array[(i * 3) + 2];

            if (!table.has(pos))
                table.set(pos, [i]);
            else
                table.get(pos).push(i);
        });

        var normals = geometry.getAttribute("normal");

        table.forEach((values, key) => {
            if (values.length > 1) {

                //Derive normal from average of duplicate position vertexes
                var derivedNormal = [false, 0, 0, 0];
                values.forEach(vertex => {
                    derivedNormal[1] += normals.array[(vertex * 3)];
                    derivedNormal[2] += normals.array[(vertex * 3) + 1];
                    derivedNormal[3] += normals.array[(vertex * 3) + 2];
                });
                derivedNormal[1] = derivedNormal[1] / values.length;
                derivedNormal[2] = derivedNormal[2] / values.length;
                derivedNormal[3] = derivedNormal[3] / values.length;

                //Add entries with array of derived normal values, followed by duplicate index list
                values.forEach(vertex => {
                    var duplicates = values.filter(v => v !== vertex);
                    var valueArray = derivedNormal.concat(duplicates);
                    curr_sharp_vertex[index].set(vertex, valueArray);
                });
            }
        });

        //Special case, a sharp edge that is divided on one side by interpolated vertex.
        //In edges [A1-B1, A2-C-B2], with A1/A2 and B1/B2 being vertexes at the same positions, and A1-C being colinear and contained within A1-B1:
        //C must also be considered a "sharp vertex", despite not having any duplicates.
        curr_surface_borders[index].forEach((neighbors, vertexIndex) => {

            if (!curr_sharp_vertex[index].has(vertexIndex)) {
                var found = false;

                neighbors.forEach(neighborVertex => {
                    if (found) return;

                    if (curr_sharp_vertex[index].has(neighborVertex)) {

                        var neighborDupes = curr_sharp_vertex[index].get(neighborVertex).slice(4);

                        neighborDupes.forEach(neighborDupeVertex => {
                            if (found) return;

                            if (curr_surface_borders[index].has(neighborDupeVertex)) {

                                var neighbors2 = curr_surface_borders[index].get(vertexIndex);

                                neighbors2.forEach(neighbor2Vertex => {
                                    if (found) return;

                                    var vec = new THREE.Vector3(array[(vertexIndex * 3)], array[(vertexIndex * 3) + 1], array[(vertexIndex * 3) + 2]);
                                    var vecA = new THREE.Vector3(array[(neighborDupeVertex * 3)], array[(neighborDupeVertex * 3) + 1], array[(neighborDupeVertex * 3) + 2]);
                                    var vecB = new THREE.Vector3(array[(neighbor2Vertex * 3)], array[(neighbor2Vertex * 3) + 1], array[(neighbor2Vertex * 3) + 2]);

                                    if (vectorIsBetween(vec, vecA, vecB)) {

                                        if (!curr_sharp_vertex[index].has(vertexIndex) && curr_sharp_vertex[index].has(neighbor2Vertex)) {

                                            var normal1 = curr_sharp_vertex[index].get(neighborDupeVertex);
                                            var normal2 = curr_sharp_vertex[index].get(neighbor2Vertex);

                                            var newNormalDupeArray = [true, (normal1[1] + normal2[1]) / 2, (normal1[2] + normal2[2]) / 2, (normal1[3] + normal2[3]) / 2, neighborDupeVertex, neighbor2Vertex];

                                            curr_sharp_vertex[index].set(vertexIndex, newNormalDupeArray);

                                            found = true;
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
        table = null;
    }

    function vectorIsBetween(vector, a, b) {
        var ab = a.add(b);
        var av = a.add(vector);

        var cross = ab.cross(av);
        if (Math.abs(cross) > 0.00000001) return false;

        var dot = ab.dot(av);
        if (dot > 0) return false;

        var distSqrd = ab.distanceToSquared(av);
        if (dot > distSqrd) return false;

        return true;
    }

    function generateBorderTable(index, geometry) {

        //We generate a map that fully represents all border edges.
        //These are useful to detect border vertexes in order to prevent broken surface corners.

        if (geometry.index === null || !curr_surface_borders[index] || !og_surface_borders[index])
            return;

        var geometryEdges = new Map();

        var indexes = geometry.index;
        for (var i = 0; i < indexes.count; i += 3) {
            var v1_1 = Math.min(indexes.array[i], indexes.array[i + 1]);
            var v2_1 = Math.max(indexes.array[i], indexes.array[i + 1]);
            var edge1 = v1_1 + ":" + v2_1;
            var v1_2 = Math.min(indexes.array[i + 1], indexes.array[i + 2]);
            var v2_2 = Math.max(indexes.array[i + 1], indexes.array[i + 2]);
            var edge2 = v1_2 + ":" + v2_2;
            var v1_3 = Math.min(indexes.array[i], indexes.array[i + 2]);
            var v2_3 = Math.max(indexes.array[i], indexes.array[i + 2]);
            var edge3 = v1_3 + ":" + v2_3;

            geometryEdges.set(edge1, { isEdge: (geometryEdges.has(edge1) ? false : true), vertexes: [v1_1, v2_1] });
            geometryEdges.set(edge2, { isEdge: (geometryEdges.has(edge2) ? false : true), vertexes: [v1_2, v2_2] });
            geometryEdges.set(edge3, { isEdge: (geometryEdges.has(edge3) ? false : true), vertexes: [v1_3, v2_3] });
        }

        var curr_table = new Map();
        var og_table = new Map();

        geometryEdges.forEach(function (value, key, map) {
            if (value.isEdge) {
                if (!curr_table.has(value.vertexes[0]))
                    curr_table.set(value.vertexes[0], [value.vertexes[1]]);
                else
                    curr_table.get(value.vertexes[0]).push(value.vertexes[1]);

                if (!curr_table.has(value.vertexes[1]))
                    curr_table.set(value.vertexes[1], [value.vertexes[0]]);
                else
                    curr_table.get(value.vertexes[1]).push(value.vertexes[0]);

                if (!og_table.has(value.vertexes[0]))
                    og_table.set(value.vertexes[0], [value.vertexes[1]]);
                else
                    og_table.get(value.vertexes[0]).push(value.vertexes[1]);

                if (!og_table.has(value.vertexes[1]))
                    og_table.set(value.vertexes[1], [value.vertexes[0]]);
                else
                    og_table.get(value.vertexes[1]).push(value.vertexes[0]);
            }
        });

        og_surface_borders[index] = og_table;
        curr_surface_borders[index] = curr_table;
    }

    function calculateSurfaceAspectRatio(index, geometry) {

        //We approximate the aspect ratio of the surface, in order to prevent image reference deformation.

        var border = curr_surface_borders[index];
        var positions = geometry.getAttribute("position").array;
        var uvs = geometry.getAttribute("uv").array;

        var first = true;

        var uv = { index: -1, u: 0, v: 0 };
        var Uv = { index: -1, u: 0, v: 0 };
        var uV = { index: -1, u: 0, v: 0 };
        var UV = { index: -1, u: 0, v: 0 };

        //Get "corner" vertexes
        border.forEach(function (value, key, map) {

            var u = uvs[key * 2];
            var v = uvs[(key * 2) + 1];

            if (first) {
                uv.index = key; uv.u = u; uv.v = v;
                Uv.index = key; Uv.u = u; Uv.v = v;
                uV.index = key; uV.u = u; uV.v = v;
                UV.index = key; UV.u = u; UV.v = v;

                first = false;
            }
            else {
                if (u <= uv.u && v <= uv.v) {
                    uv.index = key; uv.u = u; uv.v = v;
                }
                if (u >= Uv.u && v <= Uv.v) {
                    Uv.index = key; Uv.u = u; Uv.v = v;
                }
                if (u <= uV.u && v >= uV.v) {
                    uV.index = key; uV.u = u; uV.v = v;
                }
                if (u >= UV.u && v >= UV.v) {
                    UV.index = key; UV.u = u; UV.v = v;
                }
            }
        });

        var wTotal = 0;
        var hTotal = 0;

        var width1 = Math.sqrt(Math.pow(positions[(uv.index * 3)] - positions[(Uv.index * 3)], 2) +
            Math.pow(positions[(uv.index * 3) + 1] - positions[(Uv.index * 3) + 1], 2) +
            Math.pow(positions[(uv.index * 3) + 2] - positions[(Uv.index * 3) + 2], 2));

        var width2 = Math.sqrt(Math.pow(positions[(uV.index * 3)] - positions[(UV.index * 3)], 2) +
            Math.pow(positions[(uV.index * 3) + 1] - positions[(UV.index * 3) + 1], 2) +
            Math.pow(positions[(uV.index * 3) + 2] - positions[(UV.index * 3) + 2], 2));

        wTotal = Math.max(width1, width2);

        var height1 = Math.sqrt(Math.pow(positions[(uv.index * 3)] - positions[(uV.index * 3)], 2) +
            Math.pow(positions[(uv.index * 3) + 1] - positions[(uV.index * 3) + 1], 2) +
            Math.pow(positions[(uv.index * 3) + 2] - positions[(uV.index * 3) + 2], 2));

        var height2 = Math.sqrt(Math.pow(positions[(Uv.index * 3)] - positions[(UV.index * 3)], 2) +
            Math.pow(positions[(Uv.index * 3) + 1] - positions[(UV.index * 3) + 1], 2) +
            Math.pow(positions[(Uv.index * 3) + 2] - positions[(UV.index * 3) + 2], 2));

        hTotal = Math.max(height1, height2);

        if (wTotal < hTotal) {
            surfaceAspectRatios[index].w = 1;
            surfaceAspectRatios[index].h = wTotal / hTotal;
        }
        else if (wTotal > hTotal) {
            surfaceAspectRatios[index].w = hTotal / wTotal;
            surfaceAspectRatios[index].h = 1;
        }
    }

    /**
     * Add a new reference (image) to the indexed surface. This reference is used to customize the surface via tesselation and extrusion.
     * @param {string} index The index of the surface.
     * @param {string} image The reference image path/URL.
     * @param {int} detailLevel The level of detail/subdivisions to control tesselation.
     * @param {float} scale The scale of the extrusion process.
     */
    function addReference(index, image, detailLevel, scale) {
        return new Promise((resolve, reject) => {

            var onProgress = function (xhr) { };
            var onError = function (error) { reject(error.message) };

            textureLoader.load(image,
                function (newTexture) {
                    newTexture.minFilter = THREE.LinearFilter;

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

                        //Maintain correct default aspect ratio for image
                        newTexture.repeat.x = newTexture.repeat.x * referenceImages[index].aspectRatioW * (surfaceAspectRatios[index].enabled ? surfaceAspectRatios[index].w : 1);
                        newTexture.repeat.y = newTexture.repeat.y * referenceImages[index].aspectRatioH * (surfaceAspectRatios[index].enabled ? surfaceAspectRatios[index].h : 1);

                        texture.dispose();
                    }

                    textures[index] = newTexture;
                    surfaceMaterials[index].map = newTexture;
                    surfaceMaterials[index].needsUpdate = true;

                    imageURLs[index] = image;

                    //Process the image
                    processImage(image, index).then(result => {
                        //Apply initial deformation and apply image reference to mesh
                        updateSurface(index, detailLevel, scale).then(result => {
                            changeReferencePosition(index, newTexture.offset.x, newTexture.offset.y, newTexture.repeat.x, newTexture.repeat.y, newTexture.rotation, surfaceAspectRatios[index].enabled, scale);
                            resolve(result);
                        }).catch(err => { reject(err) });
                    }).catch(err => { reject(err) });

                }, onProgress, onError);
        });
    }

    /**
     * Removes a reference (image) from the indexed surface.
     * @param {string} index The index of the surface.
     */
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

                curr_surface_borders[index] = new Map(og_surface_borders[index]);

                if (surfaces[index].geometry) surfaces[index].geometry.dispose();
                surfaces[index].geometry = og_surfaces[index].clone();
            }
            resolve(true);
        })
    }

    /**
     * Returns a placeholder texture image.
     * @param {string} index The index/numbering of the texture.
     */
    function placeholderImage(index) {
        var index = PLACEHOLDER_MAX_INDEX < index + 1 ? PLACEHOLDER_MAX_INDEX : index;
        return PLACEHOLDER_BASE_PATH + (index + 1) + ".png";
    }

    /**
     * Updates the indexed surface, tesselating it and initiating the extrusion process using the current reference data.
     * @param {string} index The index of the surface.
     * @param {int} detailLevel The level of detail/subdivisions to control tesselation.
     * @param {float} scale The scale of the extrusion process.
     */
    async function updateSurface(index, detailLevel, scale) {

        if (!group_root)
            return Promise.reject(new Error("No model is available."));

        if (lodState[index] != detailLevel && detailLevel > 0) {

            //We select the correct surface mesh, depending on level of division
            var geometry = (detailLevel - lodState[index]) < 0 ? og_surfaces[index].clone() : curr_surfaces[index];

            //Reset border vertex/edge table if necessary
            if ((detailLevel - lodState[index]) < 0)
                curr_surface_borders[index] = new Map(og_surface_borders[index]);

            //We tesselate the mesh the necessary amount of times to match resolution/detail level
            var divisions = (detailLevel - lodState[index]) < 0 ? detailLevel : (detailLevel - lodState[index]);
            for (var i = 0; i < divisions; i++) {
                await indexedBufferGeometryTesselate(geometry, index);
            }

            //Update sharp edge vertex map
            if (curr_sharp_vertex[index].size > 0)
                findSharpVertexes(index, geometry);

            //Data management
            if (surfaces[index].geometry) surfaces[index].geometry.dispose();

            surfaces[index].geometry = surfaceState[index] ? geometry : og_surfaces[index];
            if ((detailLevel - lodState[index]) < 0)
                curr_surfaces[index].dispose();

            curr_surfaces[index] = geometry.clone();
            lodState[index] = detailLevel;

            //If a reference exists, we apply it.
            if (textures[index])
                applyReference(index, scale, true);
        }
        else if (textures[index] && surfaceState[index]) {
            //The mesh doesn't need subdivision, we only apply the reference.
            applyReference(index, scale);
        }
        return true;
    }

    /**
     * Apply the current reference (image) to the indexed surface. This extrudes the surface to deform it into the shape of the image's height data.
     * @param {string} index The index of the surface.
     * @param {float} scale The scale of the extrusion process.
     * @param {boolean} bypassCached If true, forcefully use the current surface geometry on scene.
     */
    function applyReference(index, scale, bypassCached = false) {

        if (surfaces[index] && curr_surfaces[index] && surfaceState[index] && refType[index]) {
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
            var sIdx = 4, heightValue = 0, value = 0;
            var normalValue = [0, 0, 0];
            var isSharp = false;
            var isPositive = refType[index] == REF_TYPE.POSITIVE;

            for (var i = 0; i < count; i++) {
                isSharp = curr_sharp_vertex[index].has(i);

                heightValue = lookupReferenceData(uvs[i * 2], uvs[(i * 2) + 1], i, index, vector, isSharp);
                value = isPositive ? heightValue : 1 - heightValue;

                //If "sharp", we consider the average of all vertex normal data at the point.
                if (isSharp) {
                    var sharpArray = curr_sharp_vertex[index].get(i);

                    normalValue[0] = sharpArray[1];
                    normalValue[1] = sharpArray[2];
                    normalValue[2] = sharpArray[3];

                    if (sharpArray.length > 4) {

                        for (sIdx = 4; sIdx < sharpArray.length; sIdx++) {
                            heightValue = lookupReferenceData(uvs[sharpArray[sIdx] * 2], uvs[(sharpArray[sIdx] * 2) + 1], sharpArray[sIdx], index, vector, true);
                            value += (isPositive ? heightValue : 1 - heightValue);
                        }
                        value = value / (sharpArray.length - 3);
                    }
                }
                else {
                    normalValue[0] = normals[i * 3];
                    normalValue[1] = normals[(i * 3) + 1];
                    normalValue[2] = normals[(i * 3) + 2];
                }

                vertexs[i * 3] += normalValue[0] * value * scale;
                vertexs[(i * 3) + 1] += normalValue[1] * value * scale;
                vertexs[(i * 3) + 2] += normalValue[2] * value * scale;
            }
            vertexs.needsUpdate = true;
            geometry.computeVertexNormals();

            surfaces[index].geometry = geometry;
            scaleState[index] = scale;
            return true;
        }
        else false;
    }


    function lookupReferenceData(u, v, vertexIndex, index, vec, isSharp) {
        vec.set(u, v);
        var uv = textures[index].transformUv(vec);
        var width = referenceImages[index].width;
        var height = referenceImages[index].height;

        //If the UVs belong to the edges of UV/image range or border of surface, return scale value 0 to prevent broken borders.
        if ((uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) || ((uv.x === 0 || uv.x === 1 || uv.y === 0 || uv.y === 1) && surfaceAspectRatios[index].enabled) || (curr_surface_borders[index].has(vertexIndex) && !isSharp))
            return refType[index] === REF_TYPE.POSITIVE ? 0 : 1;

        var ux = uv.x < 0 ? 0 : (uv.x > 1 ? 1 : uv.x);
        var vx = uv.y < 0 ? 0 : (uv.y > 1 ? 1 : uv.y);

        var tx = Math.min(Math.round(ux * width), width - 1);
        var ty = Math.min(Math.round(vx * height), height - 1);
        var offset = (ty * width + tx);

        return referenceImages[index].data[offset];
    }

    /**
     * Process reference image to extract height data and necessary reference data.
     * @param {string} image The reference image path/URL.
     * @param {string} index The index of the surface.
     */
    function processImage(image, index) {
        return new Promise((resolve, reject) => {

            var onProgress = function (xhr) { };
            var onError = function (error) { reject(error) };

            imageLoader.load(image, target => {

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

                        // Create negative monochrome value from red, green and blue values
                        var lum = 0.299 * data[pixel_offset] + 0.587 * data[pixel_offset + 1] + 0.114 * data[pixel_offset + 2];

                        heightData[height_pixel_index++] = (lum / 255);
                    }
                }

                //Calculate texture default aspect ratio
                var wRatio = 1;
                var hRatio = 1;

                if (imgWidth > imgHeight)
                    hRatio = imgHeight / imgWidth;
                else
                    wRatio = imgWidth / imgHeight;

                //Store the reference
                referenceImages[index] = { width: cWidth, height: cHeight, aspectRatioW: wRatio, aspectRatioH: hRatio, data: heightData };

                resolve(true);
            },
                onProgress, onError);
        });
    }


    /* OPTION FUNCTIONS  */

    /**
     * Changes the solid color of the model.
     * @param {string} color The solid color value in hexadecimal.
     */
    function colorize(color) {
        if (group_root) {

            //Change color for shared materials
            colorMaterial.color.set(color);
            wireMaterial.color.set(color);

            colorMaterial.needsUpdate = true;
            wireMaterial.needsUpdate = true;

            currentColor = color;

            return true;
        }
        else return false;
    }

    /**
     * Changes the viewer mode for the scene. Eg. change model material to wireframe or solid color.
     * @param {string} mode The viewer mode to change into. Available ones in [VIEWMODES].
     */
    function changeViewMode(mode) {
        if (group_root) {

            //Update material on static models
            models.forEach(model => {
                switch (mode.toLowerCase()) {
                    case VIEWMODES.WIREFRAME:
                        model.material = wireMaterial; break;
                    default:
                        model.material = colorMaterial; break;
                }
            });
            //Update materials on dynamic surfaces
            surfaces.forEach((surface, index) => {
                switch (mode.toLowerCase()) {
                    case VIEWMODES.WIREFRAME:
                        surface.material = wireMaterial; break;
                    case VIEWMODES.TEXTURE:
                        surface.material = surfaceMaterials[index]; break;
                    default:
                        surface.material = colorMaterial; break;
                }
            });
            viewerMode = mode.toLowerCase();
            return true;
        }
        else return false;
    }

    /**
     * Change reference use state.
     * @param {int} index The index of the surface.
     * @param {boolean} state If true, reference is used. Otherwise, it is ignored in the scene.
     * @param {float} scale The scale of the extrusion process.
     */
    function changeReferenceState(index, state, scale) {
        if (!state && surfaceState[index] != state) {
            if (surfaces[index].geometry) surfaces[index].geometry.dispose();
            surfaces[index].geometry = og_surfaces[index].clone();
            surfaceState[index] = false;
        }
        else if (state && surfaceState[index] != state) {
            surfaceState[index] = true;
            applyReference(index, scale);
        }
        return true;
    }

    /**
     * Change the type of reference for height data calculation.
     * @param {int} index The index of the surface.
     * @param {string} type The type of the reference, from those within "REF_TYPE": [positive] or [negative]. Positive uses lower intesity levels as lower height values, while Negative does the oposite.
     * @param {float} scale The scale of the extrusion process.
     */
    function changeReferenceType(index, type, scale) {
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
        return true;
    }

    /**
     * Change the position/scale/rotation of reference for UV calculation and extrusion.
     * @param {int} index The index of the surface.
     * @param {float} tx Translation on the X texture axis.
     * @param {float} ty Translation on the Y texture axis.
     * @param {float} sx Scaling on the X texture axis.
     * @param {float} sy Scaling on the Y texture axis.
     * @param {float} rotation Reference/Texture rotation in radians.
     * @param {boolean} sar If true, use automatic surface aspect ratio correction.
     * @param {float} scale The scale of the extrusion process.
     */
    function changeReferencePosition(index, tx, ty, sx, sy, rotation, sar, scale) {

        var texture = textures[index];

        var mat = surfaces[index].material;
        surfaces[index].material = surfaceMaterials[index];
        surfaceMaterials[index].needsUpdate = true;
        
        surfaceAspectRatios[index].enabled = sar;

        var centerx = 0.5;
        var centery = 0.5;

        //Rotate translated offset to match new frame of reference
        var py = (Math.cos(rotation) * (-ty)) - (Math.sin(rotation) * (-tx));
        var px = (Math.sin(rotation) * (-ty)) + (Math.cos(rotation) * (-tx));

        texture.center.set(centerx, centery);
        texture.offset.set(px, py);
        texture.repeat.set(sx / referenceImages[index].aspectRatioW / (sar ? surfaceAspectRatios[index].w : 1),
            sy / referenceImages[index].aspectRatioH / (sar ? surfaceAspectRatios[index].h : 1));
        texture.rotation = rotation;
        texture.needsUpdate = true;

        //Keep state for ease of access of interface derived values.
        positionState[index][0] = tx;
        positionState[index][1] = ty;
        positionState[index][2] = sx;
        positionState[index][3] = sy;
        positionState[index][4] = rotation;

        render();
        surfaces[index].material = mat;
        applyReference(index, scale);

        return true;
    }


    /* TESSELATION UTILS */

    async function indexedBufferGeometryTesselate(geometry, index) {

        //We tesselate the geometry once, dividing each face.

        var positions = geometry.getAttribute("position");
        var normals = geometry.getAttribute("normal");
        var uvs = geometry.getAttribute("uv");
        var indexes = geometry.index.array;
        var totalIndexCount = geometry.index.count;

        var newPositionArray = [];
        var newNormalArray = [];
        var newUVArray = [];
        var newIndexArray = [];

        if (window.Worker) {

            return new Promise((resolve, reject) => {

                tesselationWorker.postMessage({
                    positionCount: positions.count,
                    totalIndexCount: totalIndexCount,
                    positions: positions.array.buffer,
                    normals: normals.array.buffer,
                    uvs: uvs.array.buffer,
                    indexes: indexes.buffer,
                    indexBufferType: indexes.BYTES_PER_ELEMENT
                }, [positions.array.buffer, normals.array.buffer, uvs.array.buffer, indexes.buffer]);

                tesselationWorker.onmessage = function (result) {

                    newPositionArray = new Float32Array(result.data.newPositionArray);
                    newNormalArray = new Float32Array(result.data.newNormalArray);
                    newUVArray = new Float32Array(result.data.newUVArray);
                    var newBorder = new Uint32Array(result.data.newBorder);

                    if (positions.count + (totalIndexCount / 3) <= Math.pow(2, 8)) {
                        newIndexArray = new Uint8Array(result.data.newIndexArray);
                    }
                    else if (positions.count + (totalIndexCount / 3) <= Math.pow(2, 16)) {
                        newIndexArray = new Uint16Array(result.data.newIndexArray);
                    }
                    else if (positions.count + (totalIndexCount / 3) <= Math.pow(2, 32)) {
                        newIndexArray = new Uint32Array(result.data.newIndexArray);
                    }
                    else newIndexArray = new BigUint64Array(result.data.newIndexArray);
                    
                    var border = curr_surface_borders[index];

                    for(var v = 0; v < newBorder.length; v+=3)
                        updateBorderNewVertex(border, newBorder[v+1], newBorder[v+2], newBorder[v]);

                    geometry.addAttribute("position", new THREE.BufferAttribute(newPositionArray, 3, false));
                    geometry.addAttribute("normal", new THREE.BufferAttribute(newNormalArray, 3, false));
                    geometry.addAttribute("uv", new THREE.BufferAttribute(newUVArray, 2, false));
                    geometry.setIndex(new THREE.BufferAttribute(newIndexArray, 1, false));
                    geometry.index.needsUpdate = true;
                    geometry.needsUpdate = true;

                    resolve(true);
                }

                tesselationWorker.onerror = function(err){
                    reject(err);
                }
            });
        }
        else {
            newPositionArray = Array.from(positions.array);
            newNormalArray = Array.from(normals.array);
            newUVArray = Array.from(uvs.array);

            if (positions.count + (totalIndexCount / 3) <= Math.pow(2, 8)) {
                newIndexArray = new Uint8Array(indexes.length * 2);
            }
            else if (positions.count + (totalIndexCount / 3) <= Math.pow(2, 16)) {
                newIndexArray = new Uint16Array(indexes.length * 2);
            }
            else if (positions.count + (totalIndexCount / 3) <= Math.pow(2, 32)) {
                newIndexArray = new Uint32Array(indexes.length * 2);
            }
            else newIndexArray = new BigUint64Array(indexes.length * 2);

            var mapPositions = new Map();

            for (var i = 0; i < positions.count; i++) {
                var key = positions.array[(i * 3)] + positions.array[(i * 3) + 1] + positions.array[(i * 3) + 2]
                    + normals.array[(i * 3)] + normals.array[(i * 3) + 1] + normals.array[(i * 3) + 2]
                    + uvs.array[(i * 2)] + uvs.array[(i * 2) + 1];
                if (!mapPositions.has(key))
                    mapPositions.set(key, [i]);
                else
                    mapPositions.get(key).push(i);
            }

            var vertex1 = [0, 0, 0]; var vertex2 = [0, 0, 0]; var vertex3 = [0, 0, 0];
            var normal1 = [0, 0, 0]; var normal2 = [0, 0, 0]; var normal3 = [0, 0, 0];
            var uv1 = [0, 0]; var uv2 = [0, 0]; var uv3 = [0, 0];

            var indexIdx = 0; //Index of current vertex index in the indexes array
            var currVertexIdx = positions.count; //Index of next vertex to be added

            var border = curr_surface_borders[index];

            for (var indexCount = 0; indexCount * 3 < totalIndexCount; indexCount++) {

                var index1 = indexes[(indexCount * 3)];
                var index2 = indexes[(indexCount * 3) + 1];
                var index3 = indexes[(indexCount * 3) + 2];

                vertex1[0] = positions.array[(index1 * 3)];
                vertex1[1] = positions.array[(index1 * 3) + 1];
                vertex1[2] = positions.array[(index1 * 3) + 2];
                vertex2[0] = positions.array[(index2 * 3)];
                vertex2[1] = positions.array[(index2 * 3) + 1];
                vertex2[2] = positions.array[(index2 * 3) + 2];
                vertex3[0] = positions.array[(index3 * 3)];
                vertex3[1] = positions.array[(index3 * 3) + 1];
                vertex3[2] = positions.array[(index3 * 3) + 2];

                normal1[0] = normals.array[(index1 * 3)];
                normal1[1] = normals.array[(index1 * 3) + 1];
                normal1[2] = normals.array[(index1 * 3) + 2];
                normal2[0] = normals.array[(index2 * 3)];
                normal2[1] = normals.array[(index2 * 3) + 1];
                normal2[2] = normals.array[(index2 * 3) + 2];
                normal3[0] = normals.array[(index3 * 3)];
                normal3[1] = normals.array[(index3 * 3) + 1];
                normal3[2] = normals.array[(index3 * 3) + 2];

                uv1[0] = uvs.array[(index1 * 2)];
                uv1[1] = uvs.array[(index1 * 2) + 1];
                uv2[0] = uvs.array[(index2 * 2)];
                uv2[1] = uvs.array[(index2 * 2) + 1];
                uv3[0] = uvs.array[(index3 * 2)];
                uv3[1] = uvs.array[(index3 * 2) + 1];

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
                    updateBorderNewVertex(border, index1, index2, newVertex);
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
                    updateBorderNewVertex(border, index2, index3, newVertex);
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
                    updateBorderNewVertex(border, index1, index3, newVertex);
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

            geometry.addAttribute("position", new THREE.BufferAttribute(newPositionArray, 3, false));
            geometry.addAttribute("normal", new THREE.BufferAttribute(newNormalArray, 3, false));
            geometry.addAttribute("uv", new THREE.BufferAttribute(newUVArray, 2, false));
            geometry.setIndex(new THREE.BufferAttribute(newIndexArray, 1, false));
            geometry.index.needsUpdate = true;
            geometry.needsUpdate = true;

            mapPositions = null;

            return true;
        }
    }

    function updateBorderNewVertex(border, index1, index2, newVertex) {
        if (!border.has(newVertex) && border.has(index1) && border.get(index1).includes(index2)) {
            var m1 = border.get(index1).map(function (v) { if (v === index2) return newVertex; else return v; });
            var m2 = border.get(index2).map(function (v) { if (v === index1) return newVertex; else return v; });

            border.set(index1, m1);
            border.set(index2, m2);
            border.set(newVertex, [index1, index2]);
        }
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


    /* INPUT/OUTPUT UTILS */

    /**
     * Download current model in OBJ format.
     * @param {int} index The index of the surface.
     * @param {float} xF Custom scaling on the X texture axis.
     * @param {float} yF Custom scaling on the Y texture axis.
     * @param {float} zF Custom scaling on the Z texture axis.
     * @param {boolean} change If true, download model with original dimensions and positioning.
     */
    function downloadOBJ(xF = 1, yF = 1, zF = 1, change = true) {
        return new Promise((resolve, reject) => {
            if (group_root) {

                //If web workers are supported, we assign one the task.
                if (window.Worker) {
                    var exporter = new Worker('./libs/exportWorker.js');

                    exporter.postMessage(["obj", scene.toJSON(), scaleFactor,
                        translateFactor.x, translateFactor.y, translateFactor.z,
                        SCALE_UNIFORM[0], SCALE_UNIFORM[1], SCALE_UNIFORM[2]]);

                    exporter.onmessage = function (e) {
                        fetch(e.data).then(res => res.blob())
                            .then(res => {
                                saveAs(res, "model" + '.obj');
                                URL.revokeObjectURL(e.data);
                                exporter.terminate();
                                resolve(true);
                            })
                            .catch(err => {
                                URL.revokeObjectURL(e.data);
                                exporter.terminate();
                                reject(err);
                            });
                    }
                }
                else {
                    var result = "";
                    var exporter = new THREE.OBJExporter();

                    if (change) {
                        group_root.traverse(function (child) {
                            if (child instanceof THREE.Mesh) {
                                //Return to normal scale and position.
                                child.geometry.scale((1 / scaleFactor) * (1 / SCALE_UNIFORM[0]), (1 / scaleFactor) * (1 / SCALE_UNIFORM[1]), (1 / scaleFactor) * (1 / SCALE_UNIFORM[2]));
                                child.geometry.translate(translateFactor.x, translateFactor.y, translateFactor.z);
                            }
                        });

                        result = exporter.parse(group_root);

                        group_root.traverse(function (child) {
                            if (child instanceof THREE.Mesh) {
                                //Return to modified scale and position.
                                child.geometry.translate(-translateFactor.x, -translateFactor.y, -translateFactor.z);
                                child.geometry.scale((scaleFactor) * (SCALE_UNIFORM[0]), (scaleFactor) * (SCALE_UNIFORM[1]), (scaleFactor) * (SCALE_UNIFORM[2]));
                            }
                        });
                    }
                    else
                        result = exporter.parse(group_root);

                    var blob = new Blob([result], { type: 'application/octet-stream' });
                    saveAs(blob, "model" + '.obj');

                    resolve(true);
                }
            }
            else
                reject(new Error("No model available for download."));
        });
    }

    /**
     * Download current model in STL format.
     * @param {int} index The index of the surface.
     * @param {float} xF Custom scaling on the X texture axis.
     * @param {float} yF Custom scaling on the Y texture axis.
     * @param {float} zF Custom scaling on the Z texture axis.
     * @param {boolean} change If true, download model with original dimensions and positioning.
     */
    function downloadSTL(xF = 1, yF = 1, zF = 1, binary = true, change = true) {
        return new Promise((resolve, reject) => {
            if (group_root) {

                //If web workers are supported, we assign one the task.
                if (window.Worker) {
                    var exporter = new Worker('./libs/exportWorker.js');

                    exporter.postMessage(["stl", scene.toJSON(), scaleFactor,
                        translateFactor.x, translateFactor.y, translateFactor.z,
                        SCALE_UNIFORM[0], SCALE_UNIFORM[1], SCALE_UNIFORM[2],
                        true
                    ]);

                    exporter.onmessage = function (e) {
                        fetch(e.data).then(res => res.blob())
                            .then(res => {
                                saveAs(res, "model" + '.stl');
                                URL.revokeObjectURL(e.data);
                                exporter.terminate();
                                resolve(true);
                            })
                            .catch(err => {
                                URL.revokeObjectURL(e.data);
                                exporter.terminate();
                                reject(err);
                            });
                    }
                }
                else {
                    var result = "";
                    var exporter = new THREE.STLExporter();

                    if (change) {
                        group_root.traverse(function (child) {
                            if (child instanceof THREE.Mesh) {
                                //Return to normal scale and position.
                                child.geometry.scale((1 / scaleFactor) * (1 / SCALE_UNIFORM[0]), (1 / scaleFactor) * (1 / SCALE_UNIFORM[1]), (1 / scaleFactor) * (1 / SCALE_UNIFORM[2]));
                                child.geometry.translate(translateFactor.x, translateFactor.y, translateFactor.z);
                            }
                        });

                        result = exporter.parse(group_root, { binary: binary });

                        group_root.traverse(function (child) {
                            if (child instanceof THREE.Mesh) {
                                //Return to modified scale and position.
                                child.geometry.translate(-translateFactor.x, -translateFactor.y, -translateFactor.z);
                                child.geometry.scale((scaleFactor) * (SCALE_UNIFORM[0]), (scaleFactor) * (SCALE_UNIFORM[1]), (scaleFactor) * (SCALE_UNIFORM[2]));
                            }
                        });
                    }
                    else
                        result = exporter.parse(group_root, { binary: binary });

                    var blob = new Blob([result], { type: 'model/stl' });
                    saveAs(blob, "model" + '.stl');

                    resolve(true);
                }
            }
            else
                reject(new Error("No model available for download."));
        });
    }

    /**
     * Download current model in GLB format.
     * @param {int} index The index of the surface.
     * @param {float} xF Custom scaling on the X texture axis.
     * @param {float} yF Custom scaling on the Y texture axis.
     * @param {float} zF Custom scaling on the Z texture axis.
     * @param {boolean} change If true, download model with original dimensions and positioning.
     */
    function downloadGLTF(xF = 1, yF = 1, zF = 1, change = true, binary = true) {
        return new Promise((resolve, reject) => {
            if (group_root) {

                //If web workers are supported, we assign one the task.
                if (window.Worker) {
                    var exporter = new Worker('./libs/exportWorker.js');

                    exporter.postMessage(["gltf", scene.toJSON(), scaleFactor,
                        translateFactor.x, translateFactor.y, translateFactor.z,
                        SCALE_UNIFORM[0], SCALE_UNIFORM[1], SCALE_UNIFORM[2],
                        true, binary
                    ]);

                    exporter.onmessage = function (e) {
                        fetch(e.data).then(res => res.blob())
                            .then(res => {
                                saveAs(res, "model" + (binary ? '.glb' : 'gltf'));
                                URL.revokeObjectURL(e.data);
                                exporter.terminate();
                                resolve(true);
                            })
                            .catch(err => {
                                URL.revokeObjectURL(e.data);
                                exporter.terminate();
                                reject(err);
                            });
                    }
                }
                else {
                    var exporter = new THREE.GLTFExporter();

                    var onComplete = function (result) {
                        var blob = new Blob([result], { type: (binary ? 'model/gltf-binary' : 'model/gltf+json') });
                        saveAs(blob, "model" + (binary ? '.glb' : 'gltf'));
                        resolve(true);
                    };
                    if (change) {
                        group_root.traverse(function (child) {
                            if (child instanceof THREE.Mesh) {
                                //Return to normal scale and position.
                                child.geometry.scale((1 / scaleFactor) * (1 / SCALE_UNIFORM[0]), (1 / scaleFactor) * (1 / SCALE_UNIFORM[1]), (1 / scaleFactor) * (1 / SCALE_UNIFORM[2]));
                                child.geometry.translate(translateFactor.x, translateFactor.y, translateFactor.z);
                            }
                        });

                        exporter.parse(group_root, onComplete, { forceIndices: true, binary: binary });

                        group_root.traverse(function (child) {
                            if (child instanceof THREE.Mesh) {
                                //Return to modified scale and position.
                                child.geometry.translate(-translateFactor.x, -translateFactor.y, -translateFactor.z);
                                child.geometry.scale((scaleFactor) * (SCALE_UNIFORM[0]), (scaleFactor) * (SCALE_UNIFORM[1]), (scaleFactor) * (SCALE_UNIFORM[2]));
                            }
                        });
                    }
                    else
                        exporter.parse(group_root, onComplete, { forceIndices: true, binary: binary });
                }
            }
            else
                reject(new Error("No model available for download."));
        });
    }


    /** Returns a JSON with settings and representative information regarding the interface and scene. */
    function compileJSON() {

        if (!group_root)
            return Promise.reject(new Error("No model is available."));

        var container = document.getElementById("root");

        //JSON structure
        var json_obj = {
            version: "r1.0.1",
            model_type: "",
            model_file: "",
            model_format: "",
            model_uri: "",
            model_def_uri: "",
            viewer_mode: "",
            color: "",
            surfaceCount: 0,
            surfaces: [],
            imageCount: 0,
            images: []
        };

        //General shared detail
        json_obj.model_type = modelType;
        json_obj.model_file = modelType === MODELTYPES.UPLOAD ? "model.glb" : "";
        json_obj.model_format = modelType === MODELTYPES.UPLOAD ? "glb" : modelFormat;
        json_obj.model_uri = container.getAttribute("model_uri") ? container.getAttribute("model_uri") : "";
        json_obj.model_def_uri = container.getAttribute("model_def_uri") ? container.getAttribute("model_def_uri") : "";
        json_obj.viewer_mode = viewerMode;
        json_obj.color = currentColor;

        json_obj.surfaceCount = surfaces.length;

        //Surface/Reference specific detail
        var imageIndex = 0;
        for (var i = 0; i < surfaces.length; i++) {
            var surfaceObj = {};

            surfaceObj.name = surfaces[i].name;
            surfaceObj.hasReference = textures[i] ? true : false;
            surfaceObj.referenceIndex = textures[i] ? imageIndex++ : -1;
            surfaceObj.translateX = positionState[i][0];
            surfaceObj.translateY = positionState[i][1];
            surfaceObj.scaleX = positionState[i][2];
            surfaceObj.scaleY = positionState[i][3];
            surfaceObj.rotation = positionState[i][4];
            surfaceObj.state = surfaceState[i];
            surfaceObj.resolution = lodState[i];
            surfaceObj.referenceType = refType[i];
            surfaceObj.extrusionScale = scaleState[i];
            surfaceObj.surfaceAspectEnabled = surfaceAspectRatios[i].enabled;

            json_obj.surfaces.push(surfaceObj);
        }

        //Acquire image details
        var promises = [];

        for (var i = 0; i < textures.length; i++) {
            if (textures[i] !== null) {
                promises.push(
                    new Promise((resolve, reject) => {
                        fetch(imageURLs[i])
                            .then(res => res.blob())
                            .then(res => resolve({ blob: res, index: i }))
                    })
                );
            }
        }

        json_obj.imageCount = imageIndex;

        return Promise.all(promises)
            .then(values => {
                var imageBlobs = values;

                for (var i = 0; i < imageBlobs.length; i++) {
                    var imageObj = {};

                    var index = 0;
                    for (var j = 0; j < json_obj.surfaces.length; j++)
                        if (json_obj.surfaces[j].referenceIndex == i)
                            index = j;

                    imageObj.name = imageBlobs[i].blob.name;
                    imageObj.type = imageBlobs[i].blob.type;
                    imageObj.surfaceIndex = index;

                    json_obj.images.push(imageObj);
                }
                return JSON.stringify(json_obj);
            });
    }

    /** Download current reference settings in JSON format. */
    function downloadJSON() {
        return compileJSON().then(json => {
            var blob = new Blob([json], { type: 'application/json' });
            saveAs(blob, "settings" + '.json');
            return true;
        });
    }


    /** Returns the current model's blob resource. */
    function getBaseModelBlob() {

        return new Promise((resolve) => {

            var exporter = new THREE.GLTFExporter();
            var currSurfaces = [];

            var onComplete = function (result) {
                group_root.traverse(function (child) {
                    if (child instanceof THREE.Mesh) {
                        //Return to modified scale and position.
                        child.geometry.translate(-translateFactor.x, -translateFactor.y, -translateFactor.z);
                        child.geometry.scale((scaleFactor) * (SCALE_UNIFORM[0]), (scaleFactor) * (SCALE_UNIFORM[1]), (scaleFactor) * (SCALE_UNIFORM[2]));
                    }
                });

                for (var i = 0; i < surfaces.length; i++) {
                    surfaces[i].geometry = currSurfaces[i];
                }

                resolve(new Blob([result], { type: 'model/gltf-binary' }));
            };

            for (var i = 0; i < surfaces.length; i++) {
                currSurfaces.push(surfaces[i].geometry);
                surfaces[i].geometry = og_surfaces[i];
            }

            group_root.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    //Return to normal scale and position.
                    child.geometry.scale((1 / scaleFactor) * (1 / SCALE_UNIFORM[0]), (1 / scaleFactor) * (1 / SCALE_UNIFORM[1]), (1 / scaleFactor) * (1 / SCALE_UNIFORM[2]));
                    child.geometry.translate(translateFactor.x, translateFactor.y, translateFactor.z);
                }
            });

            exporter.parse(group_root, onComplete, { forceIndices: true, binary: true });
        });
    }


    /** Returns an array with all relevant resource/asset URLs. */
    function getResourceURL() {

        if (!group_root)
            return Promise.reject(new Error("No model is available."));

        var resourceURLList = [];

        //Acquire image URLs
        for (var i = 0; i < imageURLs.length; i++)
            if (imageURLs[i] !== "") resourceURLList.push(imageURLs[i]);

        //Acquire settings JSON URL
        return compileJSON().then(json => {

            var jsonBlob = new Blob([json], { type: 'application/json' });
            if (jsonURL !== "") URL.revokeObjectURL(jsonURL);
            jsonURL = URL.createObjectURL(new File([jsonBlob], "settings.json", { type: 'application/json' }));
            resourceURLList.push(jsonURL);

            //Acquire model URL
            if (JSON.parse(json).model_type === MODELTYPES.UPLOAD) {
                getBaseModelBlob().then(blob => {
                    if (modelURL !== "") URL.revokeObjectURL(modelURL);
                    modelURL = URL.createObjectURL(new File([blob], "model.glb", { type: 'model/gltf-binary' }));
                    resourceURLList.push(modelURL);
                    return resourceURLList;
                });
            }
            else
                return resourceURLList;
        });

    }

    /** Returns an array with all relevant resource/asset blobs or files. */
    function getResourceBlobs() {

        if (!group_root)
            return Promise.reject(new Error("No model is available."));

        var resourceBlobList = [];

        //Acquire image blobs
        var promises = [];

        for (var i = 0; i < textures.length; i++) {
            if (textures[i] !== null) {
                promises.push(
                    new Promise((resolve, reject) => {
                        fetch(imageURLs[i])
                            .then(res => res.blob())
                            .then(res => resolve(res))
                    })
                );
            }
        }

        return Promise.all(promises)
            .then(values => {
                var imageBlobs = values;
                for (var i = 0; i < imageBlobs.length; i++)
                    resourceBlobList.push(imageBlobs[i]);

                //Acquire settings JSON blob
                return compileJSON().then(json => {

                    var jsonBlob = new Blob([json], { type: 'application/json' });
                    resourceBlobList.push(new File([jsonBlob], "settings.json", { type: 'application/json' }));

                    //Acquire model blob
                    if (JSON.parse(json).model_type === MODELTYPES.UPLOAD) {
                        return getBaseModelBlob().then(blob => {
                            resourceBlobList.push(new File([blob], "model.glb", { type: 'model/gltf-binary' }));
                            return resourceBlobList;
                        });
                    }
                    else
                        return resourceBlobList;
                });
            });
    }

    /**
     * Download complete scene (model, reference images and settings) as a zip file.
     * @param {function} updateCallback Optional callback function for progress feedback.
     */
    function downloadZip(updateCallback = function (metadata) { }) {

        if (!group_root)
            return Promise.reject(new Error("No model is available."));

        return getResourceBlobs().then(blobs => {

            var zip = new JSZip();

            for (var i = 0; i < blobs.length; i++) {
                var blob = blobs[i];
                zip.file(blob.name, blob);
            }

            return zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                mimeType: "application/x-7z-compressed",
                compressionOptions: { level: 2 }
            }, updateCallback
            ).then(function (blob) {
                saveAs(blob, "model" + '.7z');
                return true;
            })
        });
    }

    /**
     * Returns a blob or URL for a ZIP file containing all relevant resources/images/assets/files to recreate scene. 
     * @param {function} getBlob If true, function returns reference as Blob. Otherwise, it returns a URL to a Blob.
     * @param {function} updateCallback Optional callback function for progress feedback.
     */
    function getResourceZipRef(getBlob = false, updateCallback = function (metadata) { }) {

        if (!group_root)
            return Promise.reject(new Error("No model is available."));

        return getResourceBlobs().then(blobs => {

            var zip = new JSZip();

            for (var i = 0; i < blobs.length; i++) {
                var blob = blobs[i];
                zip.file(blob.name, blob);
            }

            return zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                mimeType: "application/x-7z-compressed",
                compressionOptions: { level: 2 }
            }, updateCallback
            ).then(function (blob) {
                if (getBlob)
                    return blob;
                else
                    return URL.createObjectURL(blob);
            })
        });
    }

    /**
     * Load scene using model, images and settings from within a zip file.
     * @param {string} zipFile The URL/Blob of the zip file.
     */
    function loadZip(zipFile) {
        var zipUnpacker = new JSZip();
        return zipUnpacker.loadAsync(zipFile)
            .then(zip => {
                //Unpack settings
                return zip.file("settings.json").async("text")
                    .then(jsonData => {
                        var json = JSON.parse(jsonData);
                        var modelIsUpload = json.model_type === MODELTYPES.UPLOAD;

                        //Validation
                        if (!validateZippedJson(json, zip))
                            throw new Error("Invalid JSON.");

                        //Unpack model if necessary
                        if (modelIsUpload) {
                            return zip.file(json.model_file).async("blob")
                                .then(modelBlob => {
                                    if (modelURL !== "") URL.revokeObjectURL(modelURL);
                                    modelURL = URL.createObjectURL(new File([modelBlob], json.model_file, { type: 'model/gltf-binary' }));

                                    return loadModel(modelURL, json.model_format, json.model_type, json.color)
                                        .then(surfaceList => {
                                            //Unpack images
                                            return unpackImages(zip, json, surfaceList).then(surfaceList => {
                                                colorize(json.color);
                                                changeViewMode(json.viewer_mode);
                                                return { surfaceList: surfaceList, color: json.color, viewMode: json.viewer_mode, model_url: json.model_uri, model_def_url: json.model_def_uri, model_type: json.model_type };
                                            })
                                        })
                                });
                        }
                        else return loadModel(json.model_uri, json.model_format, json.model_type, json.color)
                            .then(surfaceList => {
                                //Unpack images
                                return unpackImages(zip, json, surfaceList).then(surfaceList => {
                                    colorize(json.color);
                                    changeViewMode(json.viewer_mode);
                                    return { surfaceList: surfaceList, color: json.color, viewMode: json.viewer_mode, model_url: json.model_uri, model_def_url: json.model_def_uri, model_type: json.model_type };
                                });
                            });
                    });
            });
    }

    /** 
     * Validate JSON. Returns true if it is valid for the zip loading process. 
     * @param {object} zip The zip file.
     * @param {object} json The JSON object detailing the zip file resources.
     */
    function validateZippedJson(json, zip) {

        var validity =
            //Valid inputs
            json && zip && typeof (json) === 'object' &&
            //Correct version
            json.version === "r1.0.1" &&
            //Matching surface counts
            json.surfaceCount === json.surfaces.length &&
            //Matching image counts
            json.imageCount === json.images.length &&
            //Mandatory general fields
            json.model_type && json.model_type !== "" && json.model_format && json.model_format !== "" && json.viewer_mode && json.viewer_mode !== "" && json.color && json.color !== "" &&
            (json.model_type === MODELTYPES.UPLOAD ? (json.model_file && json.model_file !== "") : (json.model_uri && json.model_uri !== "")) &&
            //Valid model type
            [MODELTYPES.UPLOAD, MODELTYPES.PREMADE, MODELTYPES.RECONSTRUCT].includes(json.model_type) &&
            //Matching surface index crossreferencing
            json.surfaces.every((surface, index) => { return (surface.hasReference ? json.images[surface.referenceIndex] && json.images[surface.referenceIndex].surfaceIndex === index : true) }) &&
            //Matching reference image index crossreferencing
            json.images.every((image, index) => { return (json.surfaces[image.surfaceIndex] && json.surfaces[image.surfaceIndex].referenceIndex === index) }) &&
            //Check if all image files are present
            json.images.every((image) => { return zip.file(image.name) }) &&
            //Check if model file is present
            (json.model_type === MODELTYPES.UPLOAD ? zip.file(json.model_file) : true) &&
            //Mandatory surface fields
            json.surfaces.every((surface) => {
                return (!isNaN(surface.translateX) && !isNaN(surface.translateY) && !isNaN(surface.scaleX) && !isNaN(surface.scaleY) && !isNaN(surface.scaleY) &&
                    !isNaN(surface.extrusionScale) && !isNaN(surface.resolution) && "surfaceAspectEnabled" in surface && [REF_TYPE.POSITIVE, REF_TYPE.NEGATIVE].includes(surface.referenceType));
            });

        return validity;
    }

    /** 
     * Create pool of image handlers to add each as a reference and retrieve updated surface detail listing.
     * @param {object} zip The zip file.
     * @param {object} json The JSON object detailing the zip file resources.
     * @param {Array} surfaceList The list/array where all surface reference details are stored.
     */
    function unpackImages(zip, json, surfaceList) {

        //We create a promise pool to handle all references and retrieve the collective result.
        var referenceAdditions = [];
        for (var i = 0; i < json.imageCount; i++)
            referenceAdditions.push(addZippedReference(zip, json, surfaceList, i));

        return Promise.all(referenceAdditions).then(() => {
            surfaceList.forEach((surfaceDetail, index) => {
                surfaceDetail["transX"] = json.surfaces[index].translateX;
                surfaceDetail["transY"] = json.surfaces[index].translateY;
                surfaceDetail["scaleX"] = 1 / json.surfaces[index].scaleX;
                surfaceDetail["scaleY"] = 1 / json.surfaces[index].scaleY;
                surfaceDetail["rotation"] = json.surfaces[index].rotation;
                surfaceDetail["extrusion"] = json.surfaces[index].extrusionScale;
                surfaceDetail["resolution"] = json.surfaces[index].resolution;
                surfaceDetail["reference"] = json.surfaces[index].referenceType;
                surfaceDetail["surfaceAspectEnabled"] = json.surfaces[index].surfaceAspectEnabled;
                surfaceDetail["state"] = json.surfaces[index].state;
            });
            return surfaceList;
        });
    }

    /** 
     * Unzip image referenced at the index of the json reference and add it as a surface reference in current scene.
     * @param {object} zip The zip file.
     * @param {object} json The JSON object detailing the zip file resources.
     * @param {Array} surfaceList The list/array where all surface reference details are stored.
     * @param {int} index The index of the reference.
     */
    function addZippedReference(zip, json, surfaceList, index) {
        //Unzip image file and add it as reference
        return zip.file(json.images[index].name).async("blob")
            .then(imageBlob => {
                var imageURL = URL.createObjectURL(new File([imageBlob], json.images[index].name, { type: json.images[index].type }));
                var surfaceIndex = json.images[index].surfaceIndex;
                surfaceList[surfaceIndex].img_url = imageURL;

                return addReference(surfaceIndex, imageURL, json.surfaces[surfaceIndex].resolution, json.surfaces[surfaceIndex].extrusionScale)
                    .then(() => {
                        //Reinstate reference configurations
                        changeReferencePosition(surfaceIndex, json.surfaces[surfaceIndex].translateX, json.surfaces[surfaceIndex].translateY, json.surfaces[surfaceIndex].scaleX, json.surfaces[surfaceIndex].scaleY, json.surfaces[surfaceIndex].rotation, json.surfaces[surfaceIndex].surfaceAspectEnabled, json.surfaces[surfaceIndex].extrusionScale);
                        changeReferenceType(surfaceIndex, json.surfaces[surfaceIndex].referenceType, json.surfaces[surfaceIndex].extrusionScale);
                        changeReferenceState(surfaceIndex, json.surfaces[surfaceIndex].state, json.surfaces[surfaceIndex].extrusionScale);
                        return true;
                    })
            });
    }

    return {
        createScene: createScene,
        resetScene: resetScene,

        loadModel: loadModel,
        loadZip: loadZip,

        colorize: colorize,
        changeViewMode: changeViewMode,

        addReference: addReference,
        removeReference: removeReference,
        applyReference: applyReference,

        updateSurface: updateSurface,
        processImage: processImage,

        changeReferenceState: changeReferenceState,
        changeReferenceType: changeReferenceType,
        changeReferencePosition: changeReferencePosition,

        getResourceURL: getResourceURL,
        getResourceBlobs: getResourceBlobs,
        getResourceZipRef: getResourceZipRef,

        downloadOBJ: downloadOBJ,
        downloadGLTF: downloadGLTF,
        downloadSTL: downloadSTL,
        downloadJSON: downloadJSON,
        downloadZip: downloadZip,

        placeholderImage: placeholderImage,
        isMobile: IS_MOBILE,
        MODELTYPES: MODELTYPES,
        REF_TYPE: REF_TYPE,
        VIEWMODES: VIEWMODES
    };

}());

//export default LITHO3D;