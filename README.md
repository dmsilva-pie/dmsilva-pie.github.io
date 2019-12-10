## Lithographic 3D customization tool
#### Testing page for 3DPrint - dmsilva-pie.github.io

Esta página está disponibilizada para efeito de testes ligeiros e partilha de código.

Esta aplicação tem como objectivo permitir a um utilizador sem conhecimentos estensivos de modelação 3D a capacidade de manipulação ligeira de objectos 3D a partir de imagens de referência, de modo a poder disponilizar os modelos resultantes para fins de impressão 3D. Neste sentido, tal como técnicas de impressão em duas dimensões visam estampar letras e imagens em papel, esta aplicação exculpe as imagens nas superficies do modelo de modo a personaliza-lo aos desejos do utilizador.

Pretende-se disponibilizar a aplicação como componente a integrar ao sistema da ACD Print, como metodo alternativo de pré-visualização de objectos 3D, disponibilização de ficheiros por parte do usuário e definição de opções ligeiras associadas a produtos 3D do catalogo.


### Instalação

A aplicação esta construida com React, servindo-se principalmente da biblioteca *threejs* para efeitos de manipulação de objectos 3D. Manualmente, está dependente das seguintes bibliotecas:

```
npm install react
npm install react-dom
npm install three
npm install jszip
npm install file-saver
npm install react-colors
npm install react-files
npm install react-swipeable
npm install lodash
...
```

Estas bibliotecas encontram-se disponibilizadas ainda em cópia local e incorporadas no *package.json*. 
Para além destas existem pequenas bibliotecas associadas a exemplos do *threejs* que são indispensáveis para operações I/O. Estas terão de ser importadas, como modulos ou ficheiros separados:

> OBJLoader.js, STLLoader.js, GLTFLoader.js, OBJExporter.js, STLExporter.js, GLTFExporter.js

Depois podemos importar o ficheiro *lithotool3d.js* por módulo:

```
import LITHO3D from '...path/lithotool3d.js'
```

Ou por referência ao script na lista de dependências HTML. Após instalar tudo, juntamente com o bundle da interface React, basta apenas criar um elemento HTML assim:

```
<div id="root" {model_type, model_uri, model_def_uri} />
```

O id serve de âncora para o rendering do React, e os props deste são usados para inicializar a aplicação. A componente conforma-se às dimensões deste encapsulamento, permitindo o seu uso.


### Utilização

Para utilizar a aplicação, interagimos manualmente com as opções disponibilizadas para efeitos de edição de ficheiros.








