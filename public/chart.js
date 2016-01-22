var data = [10, 30, 90, 420];

var barWidth = 20;
var countryCodes = [];
var topCountries = 10;

//this is the group containing the entire chart
var chart = d3.selectAll(".chart").attr("width", "1000px").attr("height", "1000px").
append("g").
attr("transform", "translate(100, 50)");

//scaleY for scatter plot cy and y axis
//the bigger the domain, the smaller the range as the higher point will have smaller cy value
var scaleY = d3.scale.linear().range([500, 0]).domain([0, 450]);

//scaleX for scatter plot cx and x axis
var scaleXOrdinal = d3.scale.ordinal()
    .domain(["2010", "2011", "2012", "2013", "2014"])
    //rangePoints for scatter plot, rangeBands for bar chart
    //outerPadding(start and end) is 10%/2=5% of distance between 2 points
    .rangePoints([0, 900], 0.1);

function draw() {


    var checkBoxes = $("input[type='checkbox'][name='countries']").filter(":checked");
    //console.log(checkBoxes);
    var checkedCountries = [];
    for(var i=0; i<checkBoxes.length; i++){
        checkedCountries.push(checkBoxes.eq(i).val());
    }
    var countryCodes = checkedCountries.join(";");
    console.log(countryCodes);

    $.ajax("http://api.worldbank.org/countries/:countryCodes/indicators/NY.GDP.MKTP.CD?format=json&date=2010:2014".replace(":countryCodes", countryCodes)).done(processData);

}

function processData(data){
    console.log(data);

    var countryGDP = [];
    var maxGDP = 0;
    var minGDP = 0;

    if(data instanceof Array && data.length >=2){
        data = data[1];

        data.forEach(function(d){
            var countryId = d.country.id;
            var countryName = d.country.value;
            var year = d.date;
            var gdp = parseInt(d.value, 10);

            if(gdp>maxGDP) maxGDP = gdp;
            if(gdp<minGDP) minGDP = gdp;

            var existingCountry = countryGDP.filter(function(c){ return c.id === countryId;});
            var country;

            if(existingCountry.length===0) {
                country = {
                    id: countryId,
                    name: countryName,
                    gdp: []
                };

                countryGDP.push(country);
            } else {
                country = existingCountry[0];
            }

            country.gdp.push({
                year: year,
                value: gdp
            });
        });

        console.log(JSON.stringify(countryGDP));


        drawAxises(minGDP, maxGDP);
        drawChartsForAllCountries(countryGDP);
    }
}

function drawChartsForAllCountries(countries){

    var countryCharts = chart.selectAll(".individual-country-chart").data(countries, function(d){
        return d.id;
    });

    countryCharts.enter().append("g") //create one 'g' element for each country
    .attr("class", "individual-country-chart")
    .selectAll("circle").data(function(d){ return d.gdp;}) //map circles to the gdp array of each country
    .enter().append("circle")
    .attr("cx", function(d, i) {
        return scaleXOrdinal(d.year);
    })
    .attr("cy", function(d, i) {
        return scaleY(d.value);
    })
    .attr("r", 0)
    .transition().attr("r", 3);


}

function drawAxises(minGDP, maxGDP){
    scaleY = scaleY.domain([minGDP, maxGDP]);

    //generate x and y axises
    var xAxis = d3.svg.axis()
        .scale(scaleXOrdinal)
        .orient("bottom")
        .outerTickSize(0); //remove outer ticks as there are start and end outer paddings

    var yAxis = d3.svg.axis()
        .scale(scaleY)
        .orient("left");

    //append x and y axises
    chart.append("g")
        .attr("transform", "translate(0," + 500 + ")") //need to move x-axis down by chart height
        .attr("class", "axis")
        .call(xAxis);

    chart.append("g")
        .attr("class", "axis")
        .call(yAxis);
}

// function drawChart(){
//     var join = chart.selectAll("circle").data(data);

//     join.enter()
//         .append("circle")
//         .attr("cx", function(d, i) {
//             return scaleXOrdinal(i + 1 + 2010 + "");
//         })
//         .attr("cy", function(d, i) {
//             return scaleY(d);
//         })
//         .attr("r", 0)
//         .transition().attr("r", 3);

//     join.enter()
//         .append("text")
//         .attr("x", function(d, i) {
//             return scaleXOrdinal(i + 1 + 2010 + "") - 5
//         })
//         .attr("y", function(d, i) {
//             return scaleY(d) - 15;
//         })
//         .text(function(d) {
//             return d
//         });

//     var lineData = [];

//     var getLineD = d3.svg.line().
//     x(function(d) {
//         return d.x
//     }).
//     y(function(d) {
//         return d.y
//     }).
//     interpolate("linear");

//     for (var i = 0; i < data.length; i++) {
//         lineData.push({
//             x: scaleXOrdinal(i + 1 + 2010 + ""),
//             y: scaleY(data[i])
//         });
//     }

//     chart.select(".trend-line").remove();

//     var path = chart.append("path")
//         .attr("class", "trend-line")
//         .attr("d", getLineD(lineData));

//     var pathLength = path.node().getTotalLength();

//     path.attr("stroke-dasharray", pathLength + " " + pathLength)
//         .attr("stroke-dashoffset", pathLength)
//         .transition().duration(2000)
//         .ease("linear")
//         .attr("stroke-dashoffset", 0);
// }
