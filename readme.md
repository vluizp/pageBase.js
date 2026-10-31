# PageBase.js & Hierarchical Pub/Sub Architecture

> Um estudo de arquitetura e implementação de padrões de projeto em JavaScript moderno (ES6+), focando em encapsulamento de páginas, manipulação do DOM, renderização baseada em estratégias e um sistema de eventos hierárquico (Pub/Sub).

---

##  Sobre o Projeto

Este projeto nasceu como um estudo prático de **Design Patterns** aplicado ao desenvolvimento web estruturado. O objetivo foi criar uma arquitetura leve e agnóstica de frameworks composta por duas classes principais:
1. **`PageBase`**: Centraliza o ciclo de vida de componentes visuais, gerenciamento de ouvintes de eventos e um motor de mensagens baseado em tópicos hierárquicos.
2. **`Render`**: Gerencia estratégias de renderização flexíveis e desacopladas, integrando-se nativamente ao sistema de observadores da página.

---

##  Padrões de Projeto Aplicados (Design Patterns)

### 1. **Observer Pattern & Pub/Sub (Publicação/Inscrição Hierárquica)**
* **Onde:** Métodos `addTopic`, `addObserver`, `notify` na `PageBase` e a classe auxiliar `NodeTree`.
* **Como funciona:** Organiza tópicos em árvores pontilhadas (ex: `usuario.perfil.atualizacao`). O motor de notificação suporta múltiplos fluxos de propagação inspirados no DOM:
  * **`local`**: Dispara apenas no nó exato.
  * **`capture`**: Propaga descendo a árvore (raiz $\rightarrow$ alvo).
  * **`up`**: Propaga subindo a árvore (alvo $\rightarrow$ raiz / *bubbling*).
  * **`broadcasting`**: Dispara em cascata para o alvo e todos os descendentes (DFS).

### 2. **Strategy Pattern**
* **Onde:** A classe `Render` (métodos `addStrategy` e `renderStrategy`) e o método `Render()` da `PageBase`.
* **Como funciona:** Permite registrar múltiplas funções de renderização sob uma mesma chave de estratégia. O motor executa dinamicamente o comportamento esperado sem que a página precise conhecer os detalhes de *como* o HTML ou estado é manipulado. Além disso, a classe `Render` implementa o método `notify`, permitindo que o motor de render se inscreva diretamente como um *observer* nos tópicos da página.

### 3. **Mediator / Controller Pattern**
* **Onde:** A classe `PageBase`.
* **Como funciona:** Atua como um mediador central para a página, coordenando o mapeamento de elementos do DOM (`observables`), ciclo de vida de *listeners* e a comunicação com o motor de renderização.

---

##  Estrutura do Código

```text
├── NodeTree            # Estrutura de nós para tópicos aninhados e lista de observers
├── Render              # Motor de estratégias de renderização (implementa interface Observer)
│   ├── strategies      # Dicionário de arrays de funções de render
│   ├── addStrategy()   # Registra uma ou mais funções a uma estratégia
│   └── renderStrategy()# Executa as estratégias vinculadas a um contexto
└── PageBase            # Classe controladora principal da página
    ├── oservables      # Repositório de elementos/componentes mapeados
    ├── listeners       # Gerenciamento de eventos DOM vinculados
    ├── topics          # Árvore hierárquica de tópicos do Pub/Sub
    └── Métodos Principais:
        ├── addTopic()    # Cria galhos na árvore de tópicos
        ├── addObserver() # Inscreve observadores em um tópico
        ├── notify()      # Dispara notificações com suporte a múltiplos fluxos
        ├── install()     # Vincula eventos do DOM injetando a referência da Page
        └── Render()      # Aciona o motor de renderização injetando estratégias
```

## Exemplo de uso PageBase
```javascript

import { PageBase } from './infra/PageBase.js';

// 1. Inicializando a página
const minhaPagina = new PageBase([
    { id: 'btnSalvar', component: document.getElementById('btnSalvar') },
    { id: 'inputNome', component: document.getElementById('inputNome') }
]);

// 2. Definindo tópicos hierárquicos e registrando observadores
minhaPagina.addTopic('form.usuario.salvar');

minhaPagina.addObserver('form.usuario.salvar', {
    notify: (page, target, event) => {
        console.log(`Evento disparado no tipo: ${event.type}`, event.data);
    }
});

// 3. Instalando eventos do DOM de forma limpa (injeta 'page' no contexto)
minhaPagina.install('btnSalvar', 'click', (e, page) => {
    const nome = page.getComponent('inputNome').value;
    
    // Notificando os observers de forma ascendente (up)
    page.notify('form.usuario.salvar', { local: true, up: true }, { nome });
});

```

## Exemplo de uso integrado com o Render classe

```js
import { PageBase } from './PageBase.js';
import { Render } from './Render.js';

// 1. Instanciando o Engine de Render e registrando uma estratégia
const renderEngine = new Render();

renderEngine.addStrategy('usuario.salvar', (context, event) => {
    const inputVal = context.getComponent('inputNome').value;
    context.getComponent('resultado').innerText = `Olá, ${inputVal}! (Ação via: ${event.type})`;
});

// 2. Inicializando a página e associando o Render
const minhaPagina = new PageBase([
    { id: 'btnSalvar', component: document.getElementById('btnSalvar') },
    { id: 'inputNome', component: document.getElementById('inputNome') },
    { id: 'resultado', component: document.getElementById('resultado') }
]);

minhaPagina.setRender(renderEngine);

// 3. Criando tópicos e registrando o Render como Observer direto!
minhaPagina.addTopic('usuario.salvar');
minhaPagina.addObserver('usuario.salvar', renderEngine); // Render escuta o tópico diretamente

// 4. Instalando eventos e notificando
minhaPagina.install('btnSalvar', 'click', (e, page) => {
    // Dispara o tópico notificando com propagação local
    page.notify('usuario.salvar', { local: true }, { timestamp: Date.now() });
});
```

## Documentação das APIs principais

### **Render**
* Instanciação de um novo renderizador
```js
    let render = new Render();
```
* Adicionando uma estratégia de renderização ao render com `render.addStrategy() `
    * **Assinatura do método** `addStrategy(nameStrategy, ...strategies)` 



    * Interface das estratégias atrubuidas ao Render 

    ```js
    function strategy(context, event){}
    ```

    * o render pode ser usado diretamente como um ouvinte de um tópico porém o nome da estratégia de renderização deve coincidir com  o nome do evento disparado na PageBase.
```js
    render.addStrategy('usuario.salvar', (context, event) => {
        const inputVal = context.getComponent('inputNome').value;
        context.getComponent('resultado').innerText = `Olá, ${inputVal}! (Ação via: ${event.type})`;
});
```
* e depois ao notificar o render:

```js
    minhaPagina.addTopic('usuario.salvar');
    minhaPagina.addObserver('usuario.salvar', render); // Render escuta o tópico diretamente

// Instalando eventos e notificando
    minhaPagina.install('btnSalvar', 'click', (e, page) => {
    // Dispara o tópico notificando com propagação local
        page.notify('usuario.salvar', { local: true }, { timestamp: Date.now()});
    });

```

### **PageBase**

* Instanciação de uma nova PageBase 
    * *Observables* `{id:String, component:Element}`
    *  Assinatura do construtor de PageBase
    `PageBase(componentsList?: Array:Observables)`
    
    ```js
        const pageBase = new PageBase([
        { id: 'btnSalvar', component: document. getElementById('btnSalvar') },
        { id: 'inputNome', component: document.getElementById('inputNome') },
        { id: 'resultado', component: document.getElementById('resultado') }
    ]);
    ```
     * ou utiliza-se do construtor sem argumementos
    ```js 
        let pageBase = new PageBase()
    ```
* Adicionando componentes após instanciação com    `addComponent(id:String)` método.
    * O parâmetro `id` deve existir na página onde o PageBase foi instânciado, o componente será buscado no DOM. 

    ```js
    pageBase.addComponent("btnSalvar");
    ```


* Adicionando tópicos a pageBase.
    * utilizamos do método `addTopic(topic:String)`.
    ```js
        pageBase.addTopic("usuario.login.sucesso"); 
    ```
    * `topic` pode já nascer hierárquico como `usuario.login.sucesso` que será criada a estrutura (exemplo) : 

    ```js 
        let root = {
            usuario : 
                { login : 
                    { 
                        sucesso 
                    }
                }
        };
    ```

    * ou apenas `usuario`

    ```js
        pageBase.addTopic("usuario"); 
    ```
    * será criado

    ```js 
        // exemplo
        let root = {
            usuario 
        };
    ```

    * e depois :

    ```js
        //...
        pageBase.addTopic("usuario.login"); 
    ```


* Adicionando Observers a um tópico 
    * utilizamos `addObservers(topic:String, ...observers:Observers)`
        ```js
        pageBase.addObserver('usuario.login.sucesso', render);
        ```

    * `topic`: uma String compondo o tópico (se não existir é criado toda a hierárquia automaticamante)

    * *Observers* objetos que implementam a interface`{notify: (page, target, event) => {}}`
    * `page` instância do PageBase
    * `target` tópico acionado
    * `event` objeto auxiliar com informações
        ```js
            let newEvent = (target, path, data, type) =>{
                return {target, path, data, type}; 
            };
        ```
    * `target`: tópico acionado ex :`sucesso`.
    * `path`: camimho até o target ex: `usuario.login.sucesso`
    * `data`: valores do usuario passados ao método `notify` de PageBase.
    * `type` tipo de ativação da ação: local, up, broadcasting e capture.
        



*  Notificando ouvintes
    *   utilizamos o método `notify(topic:string, options = {local:true}, data:any)`

        ```js
        pageBase.notify('usuario.login.sucesso', { local: true }, { timestamp: Date.now()}); 
        ```

    * `topic`: tópico correspondente a ser ativado `usuario.login.salvar`
    * `options`: objeto `js` descrevendo o método de travessia da árvore de tópicos podendo ser um de : `local`, `up`, `capture` e `broadcasting`.
    * `data` : valores passados a estratégia implementada pelo `notify()` do observer.
    dentro do parâmetro `event` descrito acima no campo `data`.     


## Como Utilizar a biblioteca

*   importe os arquivos PageBase e Render no seu Modulo js principal ou adicione como um `script type module`. 

    ```html
    <script type="module">
         import { PageBase } from "../infra/PageBase.js";
        import { Render } from "../infra/Render.js";
    </script>
    ```

    *  Na pasta exemplos tem um arquivo de como utilizar a lib em conjunto com um .HTML seguindo a segunda abordagem citada.

    *  Se você tiver python3 no seu computador pode rodar o servidor embutido python direto na pasta de exemplos
     para ver no navegador. Clone o repositório ou baixe o zip .
     ```bash
        $ python3 -m http.server --bind 127.0.0.1 
     ```

