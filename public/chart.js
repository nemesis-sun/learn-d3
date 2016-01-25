

var barWidth = 20;
var countryCodes = [];
var topCountries = 10;

//this is the group containing the entire chart
var chart = d3.selectAll(".chart").attr("width", "2000px").attr("height", "1000px").
append("g").
attr("transform", "translate(150, 50)");

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

    //map a 'g' element to each country, with country id as key
    var countryCharts = chart.selectAll(".individual-country-chart").data(countries, function(d){
        return d.id;
    });

    //for each new country, create one 'g' element
    var newCountryCharts = countryCharts.enter().append("g")
    .attr("class", "individual-country-chart");

    //map a circle to each gdp value in country
    newCountryCharts.selectAll("circle").data(function(d){ return d.gdp;})
    .enter().append("circle")
    .attr("class", "trend-line-point")
    .attr("cx", function(d, i) {
        return scaleXOrdinal(d.year);
    })
    .attr("cy", function(d, i) {
        return scaleY(d.value);
    })
    .attr("r", 0)
    .transition().attr("r", 3);

    newCountryCharts.selectAll("text").data(function(d){ return d.gdp;})
    .enter().append("text")
    .attr("class", "trend-line-text")
    .attr("x", function(d){
        return scaleXOrdinal(d.year);
    })
    .attr("y", function(d){
        return scaleY(d.value);
    })
    .attr("text-anchor", "middle")
    .text(function(d){
        return numeral(d.value).format('($0.00a)');
    })
    .style("display", "none");


    //updated country, update all data points
    countryCharts.selectAll('circle').data(function(d){return d.gdp;})
    .attr("cx", function(d, i){
        return scaleXOrdinal(d.year);
    })
    .attr("cy", function(d, i){
        return scaleY(d.value);
    });

    countryCharts.selectAll('text').data(function(d){return d.gdp;})
    .attr("x", function(d){
        return scaleXOrdinal(d.year)-5;
    })
    .attr("y", function(d){
        return scaleY(d.value)-5;
    })
    .text(function(d){
        return numeral(d.value).format('($0.00a)');
    })
    .style("display", "none");


    //remove 'g' of exiting country
    var oldCountryCharts = countryCharts.exit();
    oldCountryCharts.remove();

    drawTrendLines(countries);
}

function drawTrendLines(countries){

    var countryTrendLineData = [];

    var getLineD = d3.svg.line()
        .x(function(d) {
            return d.x;
        })
        .y(function(d) {
            return d.y;
        })
        .interpolate("linear");

    for(var i=0; i<countries.length; i++){
        var gdp = countries[i].gdp;

        var lineData = {};
        lineData.id = countries[i].id;
        lineData.xy = [];

        for(var j=gdp.length-1; j>=0; j--){
            lineData.xy.push({
                x: scaleXOrdinal(gdp[j].year),
                y: scaleY(gdp[j].value)
            });
        }
        //console.log(JSON.stringify(lineData));
        countryTrendLineData.push(lineData);
    }

    //chart.selectAll(".trend-line").remove();



    var countryTrendLines = chart.selectAll(".individual-country-chart").data(countryTrendLineData, function(d){return d.id;});

    console.log(countryTrendLines);

    countryTrendLines.selectAll(".trend-line").remove();


    countryTrendLines
    .append("path")
    .attr("class", "trend-line")
    .attr("d", function(d) {
        //console.log(JSON.stringify(d.xy));
        return getLineD(d.xy);
    })
    .attr("stroke-dasharray", function(){
        var pathLength = this.getTotalLength();
        return pathLength+" "+pathLength;
    })
    .attr("stroke-dashoffset", function(){
        return this.getTotalLength();
    });


    // for(i=0; i<countryTrendLineData.length; i++){
    //     var path = chart.append("path")
    //     .attr("class", "trend-line")
    //     .attr("d", countryTrendLineData[i]);

    //     var pathLength = path.node().getTotalLength();

    //     path.attr("stroke-dasharray", pathLength + " " + pathLength)
    //         .attr("stroke-dashoffset", pathLength);
    // }

    chart.selectAll(".trend-line").transition().duration(500)
        .ease("linear")
        .attr("stroke-dashoffset", 0);

}

function drawAxises(minGDP, maxGDP){

    chart.selectAll(".axis").remove();

    scaleY = scaleY.domain([minGDP, maxGDP]);

    //generate x and y axises
    var xAxis = d3.svg.axis()
        .scale(scaleXOrdinal)
        .orient("bottom")
        .outerTickSize(0); //remove outer ticks as there are start and end outer paddings

    var yAxis = d3.svg.axis()
        .scale(scaleY)
        .orient("left")
        .tickFormat(function(d){
            return numeral(d).format('($0a)');
        });

    //append x and y axises
    chart.append("g")
        .attr("transform", "translate(0," + 500 + ")") //need to move x-axis down by chart height
        .attr("class", "axis")
        .call(xAxis);

    chart.append("g")
        .attr("class", "axis")
        .call(yAxis);


    chart.selectAll(".y-axis-label").remove();
    chart.append("text")
        .attr("class", "y-axis-label")
        .text("GDP")
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "end")
        .attr("y", 10);
}

$(".chart").on("mouseenter", ".trend-line", function(){
    console.log(".trend-line hover");
    $(this).parent().find(".trend-line-text").css("display", "");
});

$(".chart").on("mouseleave", ".trend-line", function(){
    console.log(".trend-line hover");
    $(this).parent().find(".trend-line-text").css("display", "none");
});

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
