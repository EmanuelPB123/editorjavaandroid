import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

let scene, camera, renderer, orbitControls, transformControls;
let shapes = [];
let selectedShape = null;
let history = [];
let historyIndex = -1;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('scene-container').appendChild(renderer.domElement);

    camera.position.z = 5;

    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.25;
    orbitControls.screenSpacePanning = false;
    orbitControls.maxPolarAngle = Math.PI / 2;

    orbitControls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.ROTATE,
        RIGHT: THREE.MOUSE.PAN
    };

    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.addEventListener('dragging-changed', function (event) {
        orbitControls.enabled = !event.value;
    });
    transformControls.addEventListener('objectChange', function() {
        addToHistory();
        generateCode();
    });
    scene.add(transformControls);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    animate();

    document.getElementById('add-shape').addEventListener('click', addShape);
    document.getElementById('apply-changes').addEventListener('click', applyChanges);
    document.getElementById('toggle-code').addEventListener('click', toggleCodeEditor);

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', handleKeyDown);
}

function toggleCodeEditor() {
    const codeEditor = document.getElementById('code-editor');
    codeEditor.style.display = codeEditor.style.display === 'none' ? 'block' : 'none';
}

function handleKeyDown(event) {
    if (event.ctrlKey && event.key === 'z') {
        undo();
    } else if (event.ctrlKey && event.key === 'y') {
        redo();
    }
}

function addToHistory() {
    const state = JSON.stringify(shapes.map(shape => ({
        type: shape.geometry.type,
        position: shape.position.toArray(),
        rotation: shape.rotation.toArray(),
        scale: shape.scale.toArray(),
        color: shape.material.color.getHex()
    })));

    history = history.slice(0, historyIndex + 1);
    history.push(state);
    historyIndex++;
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        loadState(JSON.parse(history[historyIndex]));
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        loadState(JSON.parse(history[historyIndex]));
    }
}

function loadState(state) {
    scene.children = scene.children.filter(child => !(child instanceof THREE.Mesh));
    shapes = [];

    state.forEach((shapeState, index) => {
        const shape = createShapeFromType(shapeState.type);
        shape.position.fromArray(shapeState.position);
        shape.rotation.fromArray(shapeState.rotation);
        shape.scale.fromArray(shapeState.scale);
        shape.material.color.setHex(shapeState.color);
        scene.add(shape);
        shapes.push(shape);
    });

    if (shapes.length > 0) {
        selectedShape = 0;
        attachTransformControls(shapes[selectedShape]);
    } else {
        selectedShape = null;
        transformControls.detach();
    }

    updateShapeControls();
    generateCode();
}

function createShapeFromType(type) {
    let geometry;
    switch(type) {
        case 'BoxGeometry':
            geometry = new THREE.BoxGeometry();
            break;
        case 'SphereGeometry':
            geometry = new THREE.SphereGeometry();
            break;
        case 'CylinderGeometry':
            geometry = new THREE.CylinderGeometry();
            break;
        case 'ConeGeometry':
            geometry = new THREE.ConeGeometry();
            break;
        case 'TorusGeometry':
            geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
            break;
        case 'IcosahedronGeometry':
            geometry = new THREE.IcosahedronGeometry(0.5);
            break;
        case 'OctahedronGeometry':
            geometry = new THREE.OctahedronGeometry(0.5);
            break;
        case 'TetrahedronGeometry':
            geometry = new THREE.TetrahedronGeometry(0.5);
            break;
        case 'RingGeometry':
            geometry = new THREE.RingGeometry(0.3, 0.5, 32);
            break;
        default:
            geometry = new THREE.BoxGeometry();
    }
    const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    return new THREE.Mesh(geometry, material);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function addShape() {
    const shapeType = document.getElementById('shape-select').value;
    let geometry;

    switch(shapeType) {
        case 'box':
            geometry = new THREE.BoxGeometry();
            break;
        case 'sphere':
            geometry = new THREE.SphereGeometry();
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry();
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry();
            break;
        case 'torus':
            geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
            break;
        case 'icosahedron':
            geometry = new THREE.IcosahedronGeometry(0.5);
            break;
        case 'octahedron':
            geometry = new THREE.OctahedronGeometry(0.5);
            break;
        case 'tetrahedron':
            geometry = new THREE.TetrahedronGeometry(0.5);
            break;
        case 'ring':
            geometry = new THREE.RingGeometry(0.3, 0.5, 32);
            break;
    }

    const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    shapes.push(mesh);
    selectedShape = shapes.length - 1;
    updateShapeControls();
    attachTransformControls(mesh);
    addToHistory();
    generateCode();
}

function attachTransformControls(object) {
    transformControls.attach(object);
}

function updateShapeControls() {
    const controlsDiv = document.getElementById('shape-controls');
    controlsDiv.innerHTML = '';

    if (selectedShape !== null) {
        const shape = shapes[selectedShape];

        const transformModes = ['translate', 'rotate', 'scale'];
        transformModes.forEach(mode => {
            const button = document.createElement('button');
            button.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
            button.addEventListener('click', () => {
                transformControls.setMode(mode);
            });
            controlsDiv.appendChild(button);
        });

        addControlGroup(controlsDiv, 'Posición', 'position', shape, -5, 5, 0.1);
        addControlGroup(controlsDiv, 'Rotación', 'rotation', shape, -Math.PI, Math.PI, 0.1);
        addControlGroup(controlsDiv, 'Escala', 'scale', shape, 0.1, 5, 0.1, 1);

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = '#' + shape.material.color.getHexString();
        colorInput.addEventListener('input', (e) => {
            shape.material.color.setHex(parseInt(e.target.value.substr(1), 16));
            addToHistory();
            generateCode();
        });
        controlsDiv.appendChild(colorInput);
    }
}

function addControlGroup(parent, title, property, object, min, max, step, defaultValue = 0) {
    const group = document.createElement('div');
    group.className = 'control-group';
    group.innerHTML = `<h4>${title}</h4>`;

    ['x', 'y', 'z'].forEach(axis => {
        const label = document.createElement('label');
        label.textContent = axis.toUpperCase();
        group.appendChild(label);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = object[property][axis] || defaultValue;
        input.addEventListener('input', (e) => {
            object[property][axis] = parseFloat(e.target.value);
            addToHistory();
            generateCode();
        });
        group.appendChild(input);
        group.appendChild(document.createElement('br'));
    });

    parent.appendChild(group);
}

function generateCode() {
    let code = `
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 5;

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

`;

    shapes.forEach((shape, index) => {
        let geometryCode = '';
        switch(shape.geometry.type) {
            case 'BoxGeometry':
                geometryCode = 'new THREE.BoxGeometry()';
                break;
            case 'SphereGeometry':
                geometryCode = 'new THREE.SphereGeometry()';
                break;
            case 'CylinderGeometry':
                geometryCode = 'new THREE.CylinderGeometry()';
                break;
            case 'ConeGeometry':
                geometryCode = 'new THREE.ConeGeometry()';
                break;
            case 'TorusGeometry':
                geometryCode = 'new THREE.TorusGeometry(0.5, 0.2, 16, 100)';
                break;
            case 'IcosahedronGeometry':
                geometryCode = 'new THREE.IcosahedronGeometry(0.5)';
                break;
            case 'OctahedronGeometry':
                geometryCode = 'new THREE.OctahedronGeometry(0.5)';
                break;
            case 'TetrahedronGeometry':
                geometryCode = 'new THREE.TetrahedronGeometry(0.5)';
                break;
            case 'RingGeometry':
                geometryCode = 'new THREE.RingGeometry(0.3, 0.5, 32)';
                break;
        }

        code += `
// Forma ${index + 1}
const geometry${index} = ${geometryCode};
const material${index} = new THREE.MeshPhongMaterial({ color: 0x${shape.material.color.getHexString()} });
const mesh${index} = new THREE.Mesh(geometry${index}, material${index});
mesh${index}.position.set(${shape.position.x.toFixed(2)}, ${shape.position.y.toFixed(2)}, ${shape.position.z.toFixed(2)});
mesh${index}.rotation.set(${shape.rotation.x.toFixed(2)}, ${shape.rotation.y.toFixed(2)}, ${shape.rotation.z.toFixed(2)});
mesh${index}.scale.set(${shape.scale.x.toFixed(2)}, ${shape.scale.y.toFixed(2)}, ${shape.scale.z.toFixed(2)});
scene.add(mesh${index});
`;
    });

    code += `
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
`;

    document.getElementById('code-output').value = code;
}

function applyChanges() {
    const code = document.getElementById('code-output').value;
    try {
        while (scene.children.length > 0) { 
            scene.remove(scene.children[0]); 
        }
        shapes = [];

        const createScene = new Function('THREE', 'scene', 'camera', code);
        createScene(THREE, scene, camera);

        scene.traverse(function (object) {
            if (object.isMesh) {
                shapes.push(object);
            }
        });

        selectedShape = shapes.length > 0 ? 0 : null;
        updateShapeControls();
        
        // Reañadir luces y controles
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        scene.add(transformControls);
        if (selectedShape !== null) {
            attachTransformControls(shapes[selectedShape]);
        }

        addToHistory();
    } catch (error) {
        console.error('Error aplicando cambios:', error);
        alert('Error al aplicar los cambios. Por favor, revisa el código.');
    }
}

function animate() {
    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
}

init();
