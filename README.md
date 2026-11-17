# 3D Viewer

Visualizador de modelos 3D no navegador, desenvolvido com HTML, CSS, JavaScript e [Three.js](https://threejs.org/).

## Recursos

- Importação local de arquivos `.obj`.
- Carregamento de materiais `.mtl` e texturas selecionadas junto ao modelo.
- Controles de órbita, pan, zoom e enquadramento automático.
- Modos sólido, wireframe e sólido com wireframe.
- Cor do modelo personalizável.
- Grade, eixos e rotação automática.
- Ajuste de iluminação ambiente e direcional.
- Estatísticas de vértices, faces, malhas e dimensões.
- Interface responsiva e modo de tela cheia.
- Processamento local: os modelos não são enviados para um servidor.

## Executar

Como o projeto utiliza módulos ES e importações do Three.js, execute-o por um servidor HTTP local. Não abra o arquivo `index.html` diretamente com `file://`.

Com Python:

```bash
python -m http.server 8000
```

Acesse [http://localhost:8000](http://localhost:8000).

Também é possível usar a extensão Live Server do Visual Studio Code.

## Importar modelos com materiais

Selecione o arquivo `.obj`, o respectivo `.mtl` e as imagens de textura utilizadas pelo material na mesma operação. O visualizador associa os arquivos pelo nome.

## Controles

| Ação | Controle |
|---|---|
| Rotacionar | Arrastar com o botão esquerdo |
| Mover câmera | Shift + arrastar ou modo Pan |
| Zoom | Scroll |
| Enquadrar | Botão Enquadrar ou duplo clique |

## Tecnologias

- HTML5 e CSS3
- JavaScript ES Modules
- Three.js 0.180.0
- OBJLoader, MTLLoader e OrbitControls

## Estrutura

```
3dViewer/
├── index.html
├── style.css
├── app.js
└── README.md
```

## Licença

Defina a licença do projeto antes de distribuir ou reutilizar o código.
