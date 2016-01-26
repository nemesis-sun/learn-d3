

//this is the group containing the entire chart
var chart = d3.selectAll(".chart").attr("width", "2000px").attr("height", "1000px").
append("g").
attr("transform", "translate(150, 50)");

chart.append("g").attr("class", "bar-chart");
chart.append("g").attr("class", "line-chart");

//scaleY for scatter plot cy and y axis
//the bigger the domain, the smaller the range as the higher point will have smaller cy value
var scaleY = d3.scale.linear().range([500, 0]);
var scaleYForBar = d3.scale.linear().range([500,0]);

//scaleX for scatter plot cx and x axis
var scaleXOrdinal = d3.scale.ordinal()
    .domain(["2010", "2011", "2012", "2013", "2014"])
    //rangePoints for scatter plot, rangeBands for bar chart
    //outerPadding(start and end) is 10%/2=5% of distance between 2 points
    .rangeRoundPoints([0, 900], 1.2);

var yearRange = ["2010", "2011", "2012", "2013", "2014"];

var scaleXBand = d3.scale.ordinal()
    .domain(yearRange)
    .rangeRoundBands([0,900], 0.1, 0.1);

var countryColorCodes = d3.scale.category10();

function draw() {


    var checkBoxes = $("input[type='checkbox'][name='countries']").filter(":checked");
    //console.log(checkBoxes);
    var checkedCountries = [];
    for(var i=0; i<checkBoxes.length; i++){
        checkedCountries.push(checkBoxes.eq(i).val().toUpperCase());
    }
    countryColorCodes.domain(checkedCountries);
    var countryCodeString = checkedCountries.join(";");

    var reqs = {
        gdp: $.ajax("http://api.worldbank.org/countries/:countryCodes/indicators/NY.GDP.MKTP.CD?format=json&date=2010:2014".replace(":countryCodes", countryCodeString)),
        gdpPC: $.ajax("http://api.worldbank.org/countries/:countryCodes/indicators/NY.GDP.PCAP.CD?format=json&date=2010:2014".replace(":countryCodes", countryCodeString))
    };

    $.when(reqs.gdp, reqs.gdpPC).done(function(gdp, gdpPC){
        processData(gdp[0]);
        processDataForBarChart(gdpPC[0]);
        drawHorizontalAxis(checkedCountries);
    });
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

        scaleY = scaleY.domain([minGDP, maxGDP]);
        drawAxises();
        drawChartsForAllCountries(countryGDP);
    }

}

function drawChartsForAllCountries(countries){

    //map a 'g' element to each country, with country id as key
    var rangeBand = scaleXBand.rangeBand();
    var trendLineChart = chart.select(".line-chart");

    var individualCountryChart = trendLineChart.selectAll(".individual-country-chart").data(countries, function(d){
        return d.id;
    });

    individualCountryChart.enter()
        .append("g")
        .attr("class", "individual-country-chart"); //for each new country, create one 'g' element


    var dataPoints = individualCountryChart.selectAll("circle").data(function(d){ return d.gdp;});

    dataPoints.enter().append("circle")
        .attr("class", "trend-line-point");

    dataPoints.attr("cx", function(d, i) {
            var x = scaleXBand(d.year) + rangeBand/2;
            //console.log("x: %s - %s", i, x);
            return x;
            //return scaleXOrdinal(d.year);
        })
        .attr("cy", function(d, i) {
            return scaleY(d.value);
        })
        .style("fill", function(){
            var countryId = d3.select(this.parentNode).datum().id;
            return countryColorCodes(countryId);
        })
        .attr("r", 0)
        .transition().attr("r", 3);

    var dataLabels = individualCountryChart.selectAll("text").data(function(d){ return d.gdp;});

    dataLabels.enter().append("text")
        .attr("class", "trend-line-text");

    dataLabels.attr("x", function(d){
            var x = scaleXBand(d.year) + rangeBand/2;
            return x;
        })
        .attr("y", function(d){
            return scaleY(d.value)-5;
        })
        .attr("text-anchor", "middle")
        .text(function(d){
            return numeral(d.value).format('($0.00a)');
        })
        .style("display", "none");


    individualCountryChart.exit().remove();

    drawTrendLines(countries);
}

function drawTrendLines(countries){

    var countryTrendLineData = [];
    var rangeBand = scaleXBand.rangeBand();
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
                x: scaleXBand(gdp[j].year)+rangeBand/2,
                y: scaleY(gdp[j].value)
            });
        }
        //console.log(JSON.stringify(lineData));
        countryTrendLineData.push(lineData);
    }

    //chart.selectAll(".trend-line").remove();



    var countryTrendLines = chart.selectAll(".individual-country-chart").data(countryTrendLineData, function(d){return d.id;});

    //console.log(countryTrendLines);

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
    })
    .style("stroke", function(){
        var countryId =  d3.select(this.parentNode).datum().id;
        return countryColorCodes(countryId);
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

function drawAxises(){

    chart.selectAll(".line-axis").remove();

    //generate x and y axises
     //remove outer ticks as there are start and end outer paddings

    var yAxis = d3.svg.axis()
        .scale(scaleY)
        .orient("left")
        .tickFormat(function(d){
            return numeral(d).format('($0a)');
        });

    chart.append("g")
        .attr("class", "line-axis axis")
        .call(yAxis);


    chart.selectAll(".line-axis-label").remove();
    chart.append("text")
        .attr("class", "line-axis-label axis-label")
        .text("GDP")
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "end")
        .attr("y", 10);
}

function processDataForBarChart(data){

    var countryBarData = [];
    var countryIds = [];
    var maxBarValue = 0, minBarValue = 0;

    if(data instanceof Array && data.length >= 2){
        data = data[1];
        data.forEach(function(d){
            var existingYear = countryBarData.filter(function(y){return y.year===d.date;});
            var value = parseInt(d.value, 10);


            if(existingYear.length>0){
                existingYear[0].gdpPC.push({
                    country: d.country.id,
                    value: value
                });
            } else {
                var year ={
                    year: d.date,
                    gdpPC: []
                };
                year.gdpPC.push({
                    country: d.country.id,
                    value: value
                });
                countryBarData.push(year);

            }

            if(countryIds.indexOf(d.country.id)<0)
                countryIds.push(d.country.id);

            if(value > maxBarValue)
                maxBarValue = value;
            if(value < minBarValue)
                minBarValue = value;
        });
    }
    scaleYForBar.domain([minBarValue, maxBarValue]);
    countryIds.sort(function(a, b){
        return a>b;
    });

    console.log(JSON.stringify(countryIds));
    //console.log(JSON.stringify(countryBarData));
    drawBarAxis(minBarValue, maxBarValue);
    drawBarCharts(countryBarData, countryIds);
}

function drawBarCharts(countryBarData, countryIds){

    //var countryColorCodes = d3.scale.category10().domain(countryIds);

    var barGroupWidth = scaleXBand.rangeBand(); //width of each bar group

    var barGroupRange = d3.scale.ordinal() //bands for individual bars within a group
        .rangeRoundBands([0, barGroupWidth])
        .domain(countryIds);

    var barWidth = barGroupRange.rangeBand(); //width of each bar in a group

    var barChart = chart.select(".bar-chart");

    //join bar groups to data array by year
    var barGroups = barChart.selectAll(".gdp-bar-group")
        .data(countryBarData, function(d){return d.year;});


    barGroups.enter() //for new group (new year array in data)
        .append("g")
        .attr("class", "gdp-bar-group") //create a group of bar for each year
        .attr("transform", function(d){
            var barGroupLeftEdge = scaleXBand(d.year);
            return "translate("+barGroupLeftEdge+",0)"; //move the group to the correct x position
        });

    //for all bar groups, remove all child bars
    barGroups.selectAll(".gdp-bar-container").remove();

    //map the bars in each bar group to its gdpPC array
    var bars = barGroups.selectAll(".gdp-bar-container").data(function(d){
        return d.gdpPC;
    });

    bars.enter().append("g")
        .attr("class", "gdp-bar-container")
        .call(function(g){
            g.append("rect") //draw new bar for each country
                .attr("y", function(d){
                    //return scaleYForBar(d.value);
                    return 500;
                })
                .attr("x", function(d){
                    return barGroupRange(d.country);
                })
                .attr("height", function(d){
                    //return 500 - scaleYForBar(d.value);
                    return 0;
                })
                .attr("width", barWidth)
                .attr("class", "gdp-pc-bar")
                .style("fill", function(d){
                    return countryColorCodes(d.country);
                })
                .style("stroke", "none");
        }).call(function(g){
            g.append("text")
                .text(function(d){
                    return numeral(d.value).format("($0,0)");
                })
                .attr("y", function(d){
                    return scaleYForBar(d.value)-5;
                })
                .attr("x", function(d){
                    return barGroupRange(d.country) + barWidth/2;
                })
                .attr("text-anchor", "middle")
                .attr("class", "gdp-pc-bar-label")
                .style("display", "none");
        });

    bars.selectAll(".gdp-pc-bar")
        .transition()
        .ease("linear")
        .attr("height", function(d){
            return 500 - scaleYForBar(d.value);
        })
        .attr("y", function(d){
            return scaleYForBar(d.value);
        });

}

function drawBarAxis(){
    console.log("drawBarAxis");

    chart.selectAll(".bar-axis").remove();

    var yAxis = d3.svg.axis()
        .scale(scaleYForBar)
        .orient("right")
        .tickFormat(function(d){
            return numeral(d).format('($0a)');
        });

    chart.append("g")
        .attr("class", "bar-axis axis")
        .attr("transform", "translate("+ 900+", 0)")
        .call(yAxis);

    chart.selectAll(".bar-axis-label").remove();
    chart.append("text")
        .attr("class", "bar-axis-label axis-label")
        .text("GDP per capita")
        .attr("transform", "rotate(90)")
        .attr("text-anchor", "start")
        .attr("y", -890)
        .attr("x", 0);

}

function drawHorizontalAxis(countries){

    chart.selectAll(".x-axis").remove();

    var xAxisForBar = d3.svg.axis()
        .scale(scaleXBand)
        .orient("bottom")
        .outerTickSize(0);

    chart.append("g")
        .attr("transform", "translate(0," + 500 + ")") //need to move x-axis down by chart height
        .attr("class", "x-axis axis")
        .call(xAxisForBar);
}

$(".chart").on("mouseenter", ".trend-line", function(){
    //console.log(".trend-line hover");
    $(this).parent().find(".trend-line-text").css("display", "");
});

$(".chart").on("mouseleave", ".trend-line", function(){
    //console.log(".trend-line hover");
    $(this).parent().find(".trend-line-text").css("display", "none");
});

$(".chart").on("mouseenter", ".gdp-pc-bar", function(){
    //console.log(".trend-line hover");
    $(this).parent().find(".gdp-pc-bar-label").css("display", "");
});

$(".chart").on("mouseleave", ".gdp-pc-bar", function(){
    //console.log(".trend-line hover");
    $(this).parent().find(".gdp-pc-bar-label").css("display", "none");
});
