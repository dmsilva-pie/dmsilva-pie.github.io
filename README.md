## Litho 3D customization tool
#### Testing page for 3DPrint - [dmsilva-pie.github.io](https://dmsilva-pie.github.io/build/)

Esta página está disponibilizada para efeito de testes ligeiros e partilha de código.

Esta aplicação tem como objectivo permitir a um utilizador sem conhecimentos extensivos de modelação 3D a capacidade de manipulação simples de objectos 3D a partir de imagens de referência, de modo a poder disponilizar os modelos resultantes para fins de impressão 3D. Neste sentido, tal como técnicas de impressão em duas dimensões visam estampar letras e imagens em papel, esta aplicação exculpe as imagens nas superficies dos modelos de modo a personaliza-los aos desejos do utilizador.

Pretende-se disponibilizar a aplicação como componente a integrar ao sistema da ACD Print, como método alternativo de pré-visualização de objectos 3D, disponibilização de ficheiros por parte do usuário e definição de opções ligeiras associadas a produtos 3D do catálogo a servir.


### Instalação

A aplicação está construída com a framework do React + Material-UI, servindo-se principalmente da biblioteca *threejs* para efeitos de manipulação de objectos 3D. De forma geral, está dependente das seguintes fontes:

```
npm install react
npm install react-dom
npm install three
npm install jszip
npm install file-saver
npm install react-colors
npm install react-files
npm install react-swipeable
npm install @material-ui/core
npm install @material-ui/icons
npm install @material-ui/lab
npm install lodash
...
```

Estas bibliotecas encontram-se disponibilizadas em cópia local e incorporadas no *package.json*. 
Para além destas, existem pequenas bibliotecas associadas a exemplos do *threejs* que são indispensáveis para operações I/O. Estas terão de ser importadas, como módulos ou ficheiros separados:

> OBJLoader.js, STLLoader.js, GLTFLoader.js, OBJExporter.js, STLExporter.js, GLTFExporter.js

Depois podemos importar o ficheiro *lithotool3d.js* por módulo:

```
import LITHO3D from '...path/lithotool3d.js'
```

Ou por referência, em script na lista de dependências HTML. Após instalar tudo, juntamente com o bundle da interface gerado do build do projecto, basta apenas criar um elemento HTML assim:

```
<div id="root" {model_type, model_uri, model_def_uri} />
```

O id serve de âncora para o rendering do React, e os props deste são usados para inicializar a aplicação. A componente conforma-se às dimensões deste encapsulamento, permitindo o seu uso em multiplos contextos. Uma abordagem mobile friendly foi tomada de forma geral.

As props de inicialização são as segintes:

* model_type : Tipo de modelo/utilização/produto.
* model_uri : URL do modelo 3D pré-definido que é carregado quando a componente é inicializada.
* model_def_uri : URL do ficheiro JSON opcional que define propriedades do modelo 3D pré-definido.

Perante a implementação atual, model_type pode tomar os seguintes valores:

* [premade] : O modelo pré-definido inicial é o único que o utilizador tem acesso. Upload/Download não é fornecido.
* [upload] : Para além do modelo inicial, o utilizador pode fazer upload dos seus próprios modelos.
* [reconstruction] : Semelhante ao premade, mas com opções de manipulação diferentes relativas a reconstrução 3D de faces. (De momento, esta componente não está operacional).



### Utilização geral

Para utilizar a aplicação, interagimos manualmente com as opções disponibilizadas para efeitos de edição de modelos.

A aplicação possui as seguintes funcionalidades:

* **Change Model** - Permite fazer upload de modelos 3D para editar.
* **Color** - Permite mudar a cor do modelo.
* **Edit Surfaces** - Permite fazer o upload de imagens e manipular a aparência das superfícies do modelo.
* **Settings** - Permite alterar opções de visualização/utilização da componente.
* **Help** - Fornece informação de ajuda para facilitar o uso da aplicação.
* **Download Model** - Permite fazer o download do modelo em diversos formatos.

Para mais alguns detalhes, experimentar a [página de teste](https://dmsilva-pie.github.io/build/) e verificar a secção de ajuda.


### API / Integração

Através da referência LITHO3D conseguimos obter acesso ao estado da componente, com a possibilidade de manipular e obter os recursos nela presentes. Neste caso, falamos de modelos 3D, imagens de referência e do conjunto de opções seleccionadas.

```
LITHO3D.createScene
LITHO3D.resetScene
LITHO3D.loadModel
LITHO3D.loadZip
LITHO3D.addReference
LITHO3D.removeReference
LITHO3D.applyReference
LITHO3D.updateSurface
LITHO3D.processImage
LITHO3D.changeReferencePosition
LITHO3D.changeReferenceType
LITHO3D.changeReferenceState
LITHO3D.downloadOBJ
LITHO3D.downloadGLTF
LITHO3D.downloadSTL
LITHO3D.downloadJSON
LITHO3D.downloadZip
...
```

Para efeitos de integração, os seguintes métodos poderão ter utilidade:

```
LITHO3D.getResourceURL
LITHO3D.getResourceBlobs
LITHO3D.getResourceZipRef
```

**Proposta**: A aplicação poderia ser embebida na página de submissão de ficheiros, como alternativa à componente de submissão que existe para produtos de impressão 2D. O catálogo de produtos já está implementado, pelo que não haverá necessidade de redundância do lado desta aplicação. Através do tipo de instanciação [premade] os utilizadores têm acesso à pré-visualização de produtos e opções de modificação da sua aparência. Decidindo estes avançar para a fase de checkout, basta apenas obter os recursos relevantes da aplicação (modelo, imagens, ficheiro de configurações) de modo a fazer upload destes de forma exatamente igual à alternativa de submissão que já deverá ter sido concebida. A diferença estaria, portanto, na quantidade de interação e feedback disponibilizado ao utilizador durante esta fase crucial de estabelecimento de uma nova encomenda.


### Contactos

Para questões ou feedback, por favor contacte os autores:

* * **Diogo Silva - dm-.silva@campus.fct.unl.pt**
* * **Nuno Correia - nmc@fct.unl.pt**
* * **Fernando Birra - fpb@fct.unl.pt**


#### TODO LIST

- [x] Desenvolver README
- [ ] Lidar com questões de linguagem.
- [ ] Lidar com desconfiança de ficheiros zip.
- [ ] Lidar com integração.
- [ ] Decidir o que fazer acerca de [reconstruction].
- [ ] ???



### MIT LICENSE








