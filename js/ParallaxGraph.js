
function ParallaxGraph (containerSvg) {
    var self = {};


    var _running = false;
    var _loopInterval;

    var svg = containerSvg;
    var container;

    var width = 900,
        height = 900;

    var _nodes,
        _links;

    var _forceLayout;

    var linkSelection,
        nodeSelection;

    //layout status
    var _inflatingAnimation = false, _pauseTick = false;


    //### helpers
    function flatten(root) {
        var nodes = [], i = 0;

        function recurse(node) {
            if (node.children) node.children.forEach(recurse);
            if (!node.id) node.id = ++i;
            nodes.push(node);
        }

        recurse(root);
        return nodes;
    }

    var nodeDegree = function(node, links){
        var i = 0;
        links.forEach(function (l) {
            if(l.source == node || l.target == node){
                i++;
            }
        });
        return i;
    };

    //### Set up functions

    var setUp = function() {

        svg.attr("viewBox","0 0 900 900");
        svg.attr("preserveAspectRatio", "xMidYMid meet");
        svg.classed("parallax-demo", true);
        svg.attr({
                x:0, y:0, width:"100%", height:"100%"}
        );

        var g = svg
            .append("g")
            .attr("transform", "translate(" + [0,0] + ")");

        var rect = g.append("rect")
            .classed("interact-rect", true)
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all")
            .on("click", inflate);

        container = g.append("g").style("pointer-events", "none");


        _forceLayout = d3.layout.force()
            .size([width, height])
            .charge(function(d){return -400 * d.chargeMultiplier})
            .linkDistance(40)
            .on("tick", tick);


        linkSelection = container.selectAll(".link");
        nodeSelection = container.selectAll(".node");

        d3.json("res/graph.json", function(error, graph) {
            _nodes = graph.nodes;//flatten(graph),
            _links = graph.links;//d3.layout.tree().links(nodes)

            _nodes.forEach(function (d) {
                d.chargeMultiplier = 1;
            });

            _forceLayout
                .nodes(_nodes)
                .links(_links)
                .friction(0.5)
                ;

            _forceLayout.start();
            for (var i = 0; i < 200; ++i) _forceLayout.tick();
            _forceLayout.stop();


            _nodes.forEach(function (d) {
                d.depth = nodeDegree(d, _links) ;
                d.chargeMultiplier = 1;
            });

            _nodes = _.sortBy(_nodes, function (node){return node.depth}).reverse();

            linkSelection = linkSelection.data(_links)
                .enter().append("line")
                .attr("class", "link");

            nodeSelection = nodeSelection.data(_nodes)
                .enter().append("circle")
                .attr("class", "node")
                .attr("r", 12);

            nodeSelection.each(function (d) {
                d.dx = 0;
                d.dy = 0;
            });
        });


        var gn = new GyroNorm();
            gn.init({
                frequency:50,                   // ( How often the object sends the values - milliseconds )
                gravityNormalized:true,         // ( If the garvity related values to be normalized )
                orientationBase:GyroNorm.GAME,      // ( Can be GyroNorm.GAME or GyroNorm.WORLD. gn.GAME returns orientation values with respect to the head direction of the device. gn.WORLD returns the orientation values with respect to the actual north direction of the world. )
                decimalCount:3,                 // ( How many digits after the decimal point will there be in the return values )
                screenAdjusted:true            // ( If set to true it will return screen adjusted values. )
            }).then(function(){
            gn.start(function(data){
                //parallaxPan(data.dm.gy * 30,data.dm.gx * 30);
                parallaxPan((data.do.gamma) * 30,(data.do.beta - 50 ) * 30);

            });
        });


    };


    var getNodePosition = function(node) {
        return vec2(node.x + node.dx, node.y + node.dy);

    };

    function tick(animatedTick) {
        console.log("tick");
        if(animatedTick){
            linkSelection.transition().attr("x1", function(d) { return d.source.x + d.source.dx; })
                .attr("y1", function(d) { return d.source.y + d.source.dy; })
                .attr("x2", function(d) { return d.target.x + d.target.dx; })
                .attr("y2", function(d) { return d.target.y + d.target.dy; });

            return nodeSelection.transition().attr("cx", function(d) { return d.x + d.dx; })
                .attr("cy", function(d) { return d.y + d.dy; });
        } else {
            linkSelection.attr("x1", function(d) { return d.source.x + d.source.dx; })
                .attr("y1", function(d) { return d.source.y + d.source.dy; })
                .attr("x2", function(d) { return d.target.x + d.target.dx; })
                .attr("y2", function(d) { return d.target.y + d.target.dy; });

            nodeSelection.attr("cx", function(d) { return d.x + d.dx; })
                .attr("cy", function(d) { return d.y + d.dy; });
        }


            //RADIUS CHANGE
            //.attr("r", function (d) {
            //    var dist = vec2(d.dx, d.dy).length();
            //    var diff = (0.005 * dist)*(d.depth - 3);
            //    if(diff < 0){
            //        return 12 - Math.max(diff, -6);
            //    } else {
            //        return 12 - Math.min(diff, 6);
            //    }
            //});

    }

    var loadAssets = function(callback) {
        callback(null,null);

    };

    function getNodesInRadiusSortedByDistance(x,y,r){

        var nodes = [];
        var pos = vec2(x,y);
        _nodes.forEach(function (node) {
            var nodePos = getNodePosition(node);
            var distance = nodePos.subV(pos).length();
            if(distance <= r){
                nodes.push({node:node, distance:distance});
            }
        });

        nodes = _.sortBy(nodes, function(n){return n.distance});
        nodes = nodes.map(function(n) {return n.node});
        return nodes;
    }

    function inflate(){
        var mousePos = d3.mouse(this);
        console.log(mousePos);
        var pos = vec2(mousePos[0], mousePos[1]);


        _nodes.forEach(function (node) {
            var nodePos = getNodePosition(node);
            var distance = nodePos.subV(pos).length()/100;
            var dc = 10*(1-Math.pow(distance, 2));
            if(dc > 0)
                node.chargeMultiplier = dc;//Math.exp(-distance)*(1+Math.pow(distance, 2));
            else  node.chargeMultiplier = 1;


            //to reset all the other nodes
            node.depth = nodeDegree(node, _links);
        });

        //Depth expansion
        var nodesInRange = getNodesInRadiusSortedByDistance(pos.x, pos.y, 100);
        var increasingDepth = 1;
        nodesInRange.forEach(function (node) {
            node.depth = increasingDepth;
            increasingDepth += 1;
        });


        _forceLayout.start();
        _forceLayout.on("tick",null);
        for(var i = 0; i < 3; i++)
            _forceLayout.tick();
        _inflatingAnimation = true;
        _forceLayout.stop();
    }


    var oldDx = 0, oldDy = 0;
    function parallaxPan(dx,dy) {
        var smoothing = 5;
        dx = oldDx + (dx - oldDx) / smoothing;
        dy = oldDy + (dy - oldDy) / smoothing;

        var left = dx, top = dy;

        nodeSelection.each(function (d) {
            d.dx = left * (1 / Math.sqrt(d.depth));
            d.dy = top * (1 / Math.sqrt(d.depth));
        });

        oldDx = dx;
        oldDy = dy;

        if (!_inflatingAnimation){
            if (!_pauseTick) {
                tick();
            }
        } else {
            if (!_pauseTick) {
                tick(true).each("end", function () {_inflatingAnimation = false;_pauseTick = false});
            }
            _pauseTick = true;
        }

    }

    var init = function() {

        queue()
            //LOAD assets
            .defer(loadAssets)

            .await(function(){
                setUp();
            });

    } ();

    return self;

}

