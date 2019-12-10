/** 
 * Web Worker meant to facilitate model exporting processes 
 */

importScripts('./threejs/build/three.min.js');

onmessage = function (e) {

    //Get data and reform scene
    var loader = new THREE.ObjectLoader();
    var scene = loader.parse(e.data[1]);
    var scaleFactor = e.data[2];
    var translateFactor = { x: e.data[3], y: e.data[4], z: e.data[5] };
    var SCALE_UNIFORM = [e.data[6], e.data[7], e.data[8]];
    var change = e.data[9];
    var group_root = scene.children[2];

    //Export model in correct format, return URL to created Blob
    if (e.data[0] === "obj") {
        importScripts('./threejs/examples/js/exporters/OBJExporter.js');

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
        }
        else
            result = exporter.parse(group_root);

        var blob = new Blob([result], { type: 'application/octet-stream' });

        postMessage(URL.createObjectURL(blob));
    }
    else if (e.data[0] === "stl") {
        importScripts('./threejs/examples/js/exporters/STLExporter.js');

        var binary = e.data[10];

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

        }
        else
            result = exporter.parse(group_root, { binary: binary });

        var blob = new Blob([result], { type: 'model/stl' });
        
        postMessage(URL.createObjectURL(blob));
    }
    else if (e.data[0] === "gltf") {
        window = self;
        importScripts('./threejs/examples/js/exporters/GLTFExporter.js');

        var binary = e.data[10];
        var exporter = new THREE.GLTFExporter();
        
        var onComplete = function (result) {
            var blob = new Blob([result], { type: (binary ? 'model/gltf-binary' : 'model/gltf+json' ) });
            postMessage(URL.createObjectURL(blob));
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
        }
        else
            exporter.parse(group_root, onComplete, { forceIndices: true, binary: binary });
    }
}