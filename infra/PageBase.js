

function NodeTree()
{  
    Object.defineProperty(this, "observers", {value : [], writable:true, enumerable:false});
}



class PageBase {
    components = [];
    observables = {};
    listeners  = {}; 
    topics     = {};
    render     = null;
   
    constructor(componentList) 
    {
        if (!(componentList instanceof Array) && (componentList != undefined))
            throw TypeError("componentList deve ser uma lista de componentes da forma obj{id,component}");

        if (componentList != undefined)
            componentList.forEach(c => {
                this.observables[c.id] = c.component;
            });
    }

    // cria um topico na pagina
    addTopic(topic)
    {
        let topicTree = topic.split(".");
        let aux;

        if (!(aux = this.topics[topicTree[0]]))
            aux = this.topics[topicTree[0]] = new NodeTree();

        for (let i = 1; i < topicTree.length; i++)
        {   if (!aux[topicTree[i]]) 
                aux[topicTree[i]] = new NodeTree();
            aux = aux[topicTree[i]];
        }   

        return this;
    }

    // inscreve  observers
    addObserver(topic, ...observers)
    {   
        let tree = topic.split(".");

        let aux = (scope, tree, index) => {
            if (index >= tree.length) {
                observers.forEach(observer => { 
                    scope.observers.push(observer);
                });  
                return;
            }
            if (tree[index] in scope) 
                aux(scope[tree[index++]], tree, index);
            else 
            { 
                let newScope = scope[tree[index++]] = new NodeTree();
                aux(newScope, tree, index);    
            }
        }; 

        aux(this.topics, tree, 0);
        return this;
    }

    #resolveNode(topicTree)
    {   
        let path = [];
        let nodePath = this.topics[topicTree[0]];
        
        path.push(nodePath);

        for (let i = 1; i < topicTree.length; i++)
        {
            nodePath = nodePath[topicTree[i]];
            path.push(nodePath);
        }

        return path;
    }

    #execute(node,setObservables, event)
    {
        let target = event.target;
        node.observers.forEach( observer => {
            if (!(setObservables.has(JSON.stringify({observer , target}))))
                observer.notify(this, target, event);
            setObservables.add(JSON.stringify({observer , target}));
        });
    }
    // notifica os observers do topico
    notify(topic, options = {local:true}, data)
    {
        let setObservables = new Set();
        let topicTree = topic.split(".");
        let path = this.#resolveNode(topicTree);

        let newEvent = (target, path, data, type) =>{
            return {target, path, data, type}; 
        };

        if (options.local)
            this.#execute(path[path.length - 1], 
                                setObservables, newEvent(topicTree[topicTree.length - 1], topic, data, "local"));

        if (options.capture) 
            for (let i = 0; i < path.length; i++)
                this.#execute(path[i], setObservables,newEvent(topicTree[i], topic, data, "capture"));
        

        if (options.up)
            for (let i = path.length - 1; i >= 0 ; i--)
                this.#execute(path[i], setObservables,newEvent(topicTree[i], topic, data, "up"));
        

        if (options.broadcasting)
        {   
            nodeToBroadcast = path[path.length-1];
            let dfs = (root) => {
                this.#execute(root, setObservables,newEvent(topicTree[topicTree.length - 1], topic, data,"broadcasting"));
                for (let ev in root)
                {   
                    this.#execute(root[ev],setObservables, newEvent(ev, topic, data,"broadcasting"));
                    dfs(root[ev]);    
                }
            };
            dfs(nodeToBroadcast);
        }
    }

    getTopics()
    {   
        let paths        = [];
        let aux = (root, ev, path) => { 
            for (let key in root) {
                path.push(aux(root[key], ev + key, path ));        
            }
            return ev;
        }
        aux(this.topics, "", paths)
        return paths;
    }

    setRender(render)
    {
        this.render = render;
        return this;
    }

    getRender()
    {
        return this.render;
    }

    getComponent(id)
    {
        return this.observables[id];
    }

    getComponents()
    {
        return this.components;
    }

    addComponent(id) 
    {
        this.observables[id] = document.getElementById(id);
        this.components.push(this.observables[id]);
        return this;
    }

    deleteComponent(id)
    { 
        if (id in this.observables)
            delete this.observables[id];
    }


    // instala um ouvinte para um determinado evento em um componente da pagina
    install(id, event, func)
    {   
        if (!(id in this.observables)) {
            throw new Error("Elemento deve pertencer a pagina atual");
        }
        let wrapped = this.#createListener(func);
        
        if (!(func in this.listeners)) {
            this.listeners[func] = [];
        }

        this.listeners[func].push({id, event, func, handle:wrapped});
        this.observables[id].addEventListener(event, wrapped);
        return this;
    }
    
    #createListener(fn)
    {   
        const page = this;
        return function (e) {
            return fn.call(this, e, page);
        }
    }
    
    detachListener(id, event, listener)
    {
        let [{handle}] = this.listeners[listener].filter((obj) => {
            if (obj.id === id && event === obj.event && obj.func === listener)
                return true;
        });
        this.observables[id].removeEventListener(event, handle);
    }

    Render(strategy, context)
    {   
        if (!context)
           this.render.renderStrategy(this, strategy);
        else
            this.render.renderStrategy(context, strategy);
        return this
    }

}

export {PageBase};
