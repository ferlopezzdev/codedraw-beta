import './style.css'
import Split from 'split-grid'
import { encode, decode} from 'js-base64'
import * as monaco from 'monaco-editor'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import JsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { getState, subscribe } from './src/state.js'
import './src/settings.js'
import JSZip from 'jszip';

const {
  fontSize,
  lineNumbers,
  minimap,
  theme,
  wordWrap
} = getState()

// Opciones del editor

const COMMON_EDITOR_OPTIONS = {
  automaticLayout: true,
  fontSize,
  lineNumbers,
  fontFamily: '-apple-system, Open Sans, Helvetica Neue, sans-serif',
  fontWeight: 'bold',
  scrollBeyondLastLine: false,
  scrollbar: "auto",
  minimap: {
    enabled: minimap
  },
  theme,
  wordWrap
}

window.MonacoEnvironment = {
  getWorker(_, label) {
    if ( label === 'html'){
      return new HtmlWorker()
    }

    if ( label === 'javascript'){
      return new JsWorker()
    }

    if ( label === 'css'){
      return new CssWorker()
    }
  }
}

const $ = selector => document.querySelector(selector)

Split({
    columnGutters: [{
        track: 1,
        element: $('.vertical-gutter'),
    }],
    rowGutters: [{
        track: 1,
        element: $('.horizontal-gutter'),
    }]
})

const $js = $('#js')
const $css = $('#css')
const $html = $('#html')

const { pathname } = window.location;

const [ rawHtml, rawCss, rawJs ] = pathname.slice(1).split('|');

const html = rawHtml ? decode(rawHtml) : ``;
const css = rawCss ? decode(rawCss) : ``;
const js = rawJs ? decode(rawJs) : ``;


const htmlEditor = monaco.editor.create($html, {
  value: html,
  language: 'html',
  ... COMMON_EDITOR_OPTIONS
})

const cssEditor = monaco.editor.create($css, {
  value: css,
  language: 'css',
 ... COMMON_EDITOR_OPTIONS
})

const jsEditor = monaco.editor.create($js, {
  value: js,
  language: 'javascript',
  ... COMMON_EDITOR_OPTIONS
})

subscribe ( state => {
  console.log("suscribe", state)
  const EDITORS = [htmlEditor, cssEditor, jsEditor]
  EDITORS.forEach( editor => {
    const { minimap, ...restOfOptions } = state
    const newOptions = {
      ...restOfOptions,
      minimap: {
        enabled: minimap
      }
    }

    editor.updateOptions({
      ...editor.getRawOptions(),
      ...newOptions
    })
  })
})

htmlEditor.onDidChangeModelContent(update)
cssEditor.onDidChangeModelContent(update)
jsEditor.onDidChangeModelContent(update)

const htmlForPreview = createHtml({ html, js, css })
$('iframe').setAttribute('srcdoc', htmlForPreview)


function update () {
  const html = htmlEditor.getValue()
  const css = cssEditor.getValue()
  const js = jsEditor.getValue()

  const hashedCode = `${encode(html)}|${encode(css)}|${encode(js)}`;
  window.history.replaceState(null, null, `${hashedCode}`);
  
  const htmlForPreview = createHtml({ html, js, css })
  $('iframe').setAttribute('srcdoc', htmlForPreview)
}

function createHtml({ html, js, css }) {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <style>
        ${css}
      </style>
    </head>
    <body>
    ${html}
    <script>
      ${js}
    </script>
    </body>
  </html>
  `;
}

// Sistema de descarga

const downloadButton = document.querySelector('.download-button');

function saveAndDownload() {
  const htmlContent = htmlEditor.getValue();
  const cssContent = cssEditor.getValue();
  const jsContent = jsEditor.getValue();

  const files = {
    'index.html': htmlContent,
    'styles.css': cssContent,
    'script.js': jsContent
  };

  // Crear un archivo ZIP y agregar los archivos
  const zip = new JSZip();
  for (const filename in files) {
    zip.file(filename, files[filename]);
  }

  // Generar el contenido del archivo ZIP
  zip.generateAsync({ type: 'blob' }).then(function (content) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);

    // Crear un cuadro de diálogo para guardar el archivo
    const filename = prompt('Descargar archivo', 'example.zip');
    if (filename) {
      link.download = filename;
      document.body.appendChild(link);

      // Simular un clic en el enlace para iniciar la descarga
      link.click();

      // Liberar el objeto URL
      URL.revokeObjectURL(link.href);
    }
  });
}

downloadButton.addEventListener('click', saveAndDownload);

// Copiar 

const copyButton = document.querySelector('.copy-button');
const copyMessage = document.getElementById('copyMessage');

copyButton.addEventListener('click', () => {

  const url = window.location.href;
  
  // Crear un elemento de entrada temporal para copiar el texto
  const tempInput = document.createElement('input');
  tempInput.value = url;
  document.body.appendChild(tempInput);
  
  // Seleccionar, copiar el contenido y eliminar el temp
  tempInput.select();
  document.execCommand('copy');
  
  document.body.removeChild(tempInput);
  
  // Mostrar el mensaje encima del mouse
  copyMessage.style.display = 'block';
  copyMessage.style.left = `${event.clientX}px`;
  copyMessage.style.top = `${event.clientY}px`;
  
  setTimeout(() => {
    copyMessage.style.display = 'none';
  }, 2000); 
});

// Subir archivos

const uploadButton = document.getElementById('uploadButton');
const fileInput = document.getElementById('fileInput');

uploadButton.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      const fileContent = e.target.result;
      const fileType = file.type;

      if (fileType === 'text/html') {
        htmlEditor.setValue(fileContent);
      } else if (fileType === 'text/css') {
        cssEditor.setValue(fileContent);
      } else if (fileType === 'application/javascript' || file.name.endsWith('.js')) {
        jsEditor.setValue(fileContent);
      }
    };

    reader.readAsText(file);
  }
}

// Reiniciar 

const clearButton = document.querySelector('.clear-button');

clearButton.addEventListener('click', () => {
  // Mostrar una confirmación antes de limpiar
  const confirmation = confirm('¿Estás seguro de que deseas limpiar todo?');

  if (confirmation) {
    // Limpiar el contenido de los editores
    htmlEditor.setValue('');
    cssEditor.setValue('');
    jsEditor.setValue('');

    // Reiniciar la URL
    window.history.replaceState(null, null, '/');
  }
});


/* Settings */

const iconSettingsButton = document.querySelector('.icon-settings');
const iconFileButton = document.querySelector('.icon-file');

const viewSetting = document.querySelector('.view.settings')
const settingsItem = document.querySelector('.settings-item')

const setGrid = document.querySelector('.grid')


// Abrir la configuracion

iconSettingsButton.addEventListener('click', () => {

  const isGridActive = setGrid.classList.contains('grid-active');

  iconSettingsButton.classList.toggle('icon-active', !isGridActive);
  setGrid.classList.toggle('grid-active');
  viewSetting.classList.toggle('active');
  iconFileButton.classList.toggle('icon-active', isGridActive);
  settingsItem.classList.toggle('hidden', isGridActive);
});

// Abrir el editor
iconFileButton.addEventListener('click', () => {
  
  document.querySelector('.grid-content').classList.remove('hidden');
  settingsItem.classList.add('hidden')
  iconFileButton.classList.add('icon-active');


  iconSettingsButton.classList.remove('icon-active');
  setGrid.classList.remove('grid-active')
  viewSetting.classList.remove('active');
});


// Abrir o cerrar Open IA

// Expandir un input

function expandInput(input) {
  input.style.height = 'auto';
  input.style.height = (input.scrollHeight) + 'px';
}