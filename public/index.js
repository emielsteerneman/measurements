l = console.log
XMAX = 1000

MAX_MEASUREMENTS = 2000
INTERVAL = 0.0105 // Time in ms between each measurement

PROBEDIAM = 1.64*0.6	//dimensions of the probe in cm
KROHNEDIAM = 5		//diameter of the krohne meter in cm

let app = new Vue({
	el: '#app',
	data: {
		listOfMeasurements : []
        ,graphInfo : {
            filename 	: 'No file chosen',
            duration 	: '-',
            measurements: '-',
            usage: 0,
            difference: 0,
        }
	},

	methods : {
		loadMeasurement
	},

	mounted : function () {
		this.$http.get('getListOfMeasurements').then(response => {
			this.listOfMeasurements = response.data
		})
	}
})

Vue.component('graphInfo', {
    props : ['filename', 'duration', 'measurements', 'usage', 'difference']
    ,template: "<div class='infoText'>"+
    "<span><b> Filename </b> : {{ filename }} </span>" +
    "<span><b> Duration </b> : {{ duration }}s </span>" +
    "<span><b> Measurements</b> : {{ measurements }} </span>" +
    "<span><b> usage </b> : 1/{{ usage }} </span>" +
    "<span><b> proportion </b> : {{ difference.toFixed(2) }} </span>" +
    "</div>"

})

Vue.component('measurement', {
    props : ['filename']
    ,template: '<div class="listItem"><a v-on:click="measurementClicked">{{ filename }}</a><br></div>'
    ,methods : {
        measurementClicked : function(){
            this.$emit('measurement-clicked', this.filename)
        }
    }
})


function loadMeasurement(filename){
	l("Loading file " + filename)
	this.$http.get(filename).then(response => {
		filterFile(response.data, filename)
	}).catch(function(error){
		l(error)
	})
}

function filterFile(file, filename){
	l("Filtering file..")
	/* ====== File to array ====== */
	let lines = file.split("\n").slice(1, -1)
	lines = _.map(lines, line => line.split(" "))
	let duration = Math.round( (_.last(lines)[0] - _.first(lines)[0]) / 1000 )

    let usage = Math.ceil(lines.length / MAX_MEASUREMENTS)
    let delta = INTERVAL * usage

    l('Using 1/'+usage+' of the measurements')

    app.graphInfo = {
        filename,
        duration,
        measurements : lines.length,
        usage
    }

	//General Setup
    let tubeDiameter = 5.5				//in cm
	let tubeArea = Math.PI * (tubeDiameter/2) * (tubeDiameter/2)
	l("diameter: " + tubeDiameter)
    l("area: " + tubeArea)


	//Setup for ADC values -> mA on pin 1 (Expensive)
	let p1_4 = 532
	let p1_20=2758
	let p1_slope = 16/(p1_20-p1_4)
	let p1_b = 4 - p1_4 * p1_slope

	let f_p1_mA = adc => adc * p1_slope + p1_b

	//Setup for ADC values -> mA on pin 2 (Cheap)
	let p2_4 = 635
    let p2_20=2875
    let p2_slope = 16/(p2_20-p2_4)
    let p2_b = 4 - p2_4 * p2_slope

    let f_p2_mA = adc => adc * p2_slope + p2_b




	//Conversion function for mA to velocity, is the same for both types of meters
    let maToVelocity = mA => 24.375 * mA - 87.5 // cm/s

	//Conversion functions from velocity to L/s, first one for cheap, second for expensive
	let velocityToLsCheap =     cms => ((1/4 * Math.PI * Math.pow(tubeDiameter,2) - PROBEDIAM) * cms)/1000	//L/s
	let velocityToLsExpensive = cms => ( 1/4 * Math.PI * Math.pow((KROHNEDIAM),2)              * cms)/1000	//L/s

	//Conversion function from velocity to L/s for both cheap and expensive
	let maToLitersCheap = mA => velocityToLsCheap(maToVelocity(mA))
	let maToLitersExpensive = mA => velocityToLsExpensive(maToVelocity(mA))




	//Functions that build the values for both the outputted ADC values and the converted values in L/s for the Krohne measurer
	let expensive = _.map(lines, 2)
	expensive = _.filter(expensive, (e, i) => i % usage == 0)
	let expensiveMA = _.map(expensive, e => f_p1_mA(parseInt(e)))

   	let expensiveLs = 0
	let expensiveMa = 0
	let expensiveMaSeries = []
	let expensiveLsSeries = []
	_.each(expensiveMA, v => {
		if(maToVelocity(v) < 11) {
			expensiveLs += 0
		}else{
			expensiveLs += maToLitersExpensive(v)*delta		//interval is 10.5ms
		}
		expensiveMa += v
		expensiveMaSeries.push(expensiveMa)
		expensiveLsSeries.push(expensiveLs)

	})




    // f_p2_flow = mA => 22.5 * mA -70 // cm/s
	//Functions that build the values for both the outputted ADC values and the converted values in L/s for the Wenglor measurer
	let cheap = _.map(lines, 3)
	cheap = _.filter(cheap, (e, i) => i % usage == 0)
	let cheapMA = _.map(cheap, e => f_p2_mA(parseInt(e)))

   	let cheapLs = 0
	let cheapMa = 0
	let cheapMaSeries = []
	let cheapLsSeries = []
	_.each(cheapMA, v => {
		if(maToVelocity(v) < 11) {
			cheapLs += 0
		}else{
			cheapLs += maToLitersCheap(v)*delta		//interval is 10.5ms
		}
		cheapMa += v
		cheapLsSeries.push(cheapLs)
		cheapMaSeries.push(cheapMa)
	})


	//Calculations for the differences in measurements between the two measurers.

	l("\n\n")
	l("cheap Ls : expensive Ls ratio: " + cheapLs/expensiveLs)
	l("cheap mA : expensive mA ratio: " + cheapMa/expensiveMa)
	l("% diff mA" + (cheapMa/expensiveMa))

	l("% diff Ls" + (cheapLs/expensiveLs))
    l("sumExpen Ls: " + expensiveLs)
    l("sumCheap Ls: " + cheapLs)
	l("sumExpen mA: " + expensiveMa)
	l("sumCheap mA: " + cheapMa)
	l("avgExpen Ls: " + expensiveLs/expensive.length)
    l("avgCheap Ls: " + cheapLs/cheap.length)
	l("avgExpen mA: " + expensiveMa/expensive.length)
    l("avgCheap mA: " + cheapMa/cheap.length)

    app.graphInfo.difference = (cheapLs/expensiveLs)

	let new_serie = [
		{
			"name"  : "Krohne mA"
			,"data" : expensiveMA
			,"color": "blue"
            ,"yAxis": 0
		},
		{
			"name"  : "Wenglor mA"
			,"data" : cheapMA
			,"color": "orange"
            ,"yAxis": 0
		},
		{
			"name"  : "Krohne Liters"
			,"data" : expensiveLsSeries
			,"color": "blue"
			,"yAxis": 1
			,"dashStyle" : "LongDash"
		},
        {
            "name"  : "Wenglor Liters"
            ,"data" : cheapLsSeries
            ,"color": "orange"
            ,"yAxis": 1
            ,"dashStyle" : "LongDash"
        },{
            "name"  : "Krohne mA sum"
            ,"data" : expensiveMaSeries
            ,"color": "blue"
            ,"yAxis": 2
            ,"dashStyle" : "ShortDot"
        },
		{
			"name"  : "Wenglor mA sum"
            ,"data" : cheapMaSeries
            ,"color": "orange"
            ,"yAxis": 2
            ,"dashStyle" : "ShortDot"
		}
	]


	for (var i = chart.series.length-1; i>=0; i--) {
		chart.series[i].remove();
	}
	for (var y = new_serie.length-1; y >= 0; y--) {
		chart.addSeries(new_serie[y]);
	}

}

let chart = Highcharts.chart('myChart',  {
	chart: {
		type: 'line',
		height: 900
	},
	title:{
		text:''
	},
	xAxis: {
		min: 0,
		max: MAX_MEASUREMENTS,
		labels: {
			enabled: false
		}
	},
	yAxis: [{
		min: 0,
		max: 24,
		title : {
			text : "mA"
		}
	},{
        min: 0,
		minRange: 10,
        title : {
            text : "Sum Liters"
        },
        opposite: true
    },{
        min: 0,
        minRange: 10,
        title : {
            text : "Sum mA"
        },
        opposite: true
    }],

	series : [{
		"name" : "No file chosen",
		"data" : []
	}]
})

















