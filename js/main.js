

$(document).ready(function() {

    $(function() {
        FastClick.attach(document.body);
    });

    var svg = d3.select("body")
        .append("div")
        .style({
            margin: "0 auto",
            height: "600px",
            width: "600px",
            border: "1px solid"
        })
        .append("svg");
    ParallaxGraph(svg);

});

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}