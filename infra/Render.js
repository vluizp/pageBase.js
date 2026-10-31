
//um concrete observer

class Render {
    strategies = {}
    // nameStrategy: nome da estrategia
    // strategy: funcao que executa a estrategia

    addStrategy(nameStrategy, ...strategies)
    {
        if (!(nameStrategy in this.strategies)) {
            this.strategies[nameStrategy] = [];
        }
        
        strategies.forEach( strategy => {
            this.strategies[nameStrategy].push(strategy);
        });

        return this;
    }

    renderStrategy(context, nameStrategy, event)
    {   
        if (!(nameStrategy in this.strategies))
            throw new Error(`renderStrategy() says:${nameStrategy} must be exist`);
        this.strategies[nameStrategy].forEach(strategy => strategy(context, event));
    }

    notify(context, target, event)
    {
        this.renderStrategy(context, target, event);
    }

}

export {Render};