l = console.log
XMAX = 1000
PROBEDIAM = 1.64*0.6	//dimensions of the probe in cm
KROHNEDIAM = 5.5		//diameter of the krohne meter in cm
let app = new Vue({
	el: '#app',
	data: {
		listOfMeasurements : []
		,graphInfo : {
			filename 	: 'No file chosen',
			duration 	: 'No file chosen',
			measurements: 'No file chosen'
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
	props : ['filename', 'duration', 'measurements']
	,template: "<div class='infoText'>"+
		"<span><b> Filename </b> : {{ filename }} </span>" + 
		"<span><b> Duration </b> : {{ duration }} </span>" + 
		"<span><b> Measurements</b> : {{ measurements }} </span>" + 
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
	let lines = file.split("\n").slice(1, -1)
	lines = _.map(lines, line => line.split(" "))
	let duration = Math.round( (_.last(lines)[0] - _.first(lines)[0]) / 1000 )

	let interval = Math.round(lines.length / XMAX)
	

	app.graphInfo = {
		filename,
		duration,
		measurements : lines.length
	}


    // let maxI = -Infinity
    // let minI = Infinity
    // let deltas = []
    // for(i = 0; i < lines.length-1; i++){
    //     let _i = lines[i+1][0] - lines[i][0]
    //     maxI = _.max([_i, maxI])
    //     minI = _.min([_i, minI])
    //     deltas.push(_i)
    // }
    // let avgI = duration*1000 / lines.length
    // l({maxI, minI, avgI})
    // l(deltas.slice(0, 100))

	//General Setup
    let tubeDiameter = 5.5				//in cm
	let tubeArea = Math.PI * (5.5/2) * (5.5/2)
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
	let velocityToLsCheap = cms => (((1/4 * Math.PI * Math.pow(tubeDiameter,2)) - PROBEDIAM)* cms)/1000	//L/s
	let velocityToLsExpensive = cms => (1/4 * Math.PI * Math.pow((KROHNEDIAM),2) * cms)/1000	//L/s
	
	//Conversion function from velocity to L/s for both cheap and expensive
	let maToLitersCheap = mA => velocityToLsCheap(maToVelocity(mA))
	let maToLitersExpensive = mA => velocityToLsExpensive(maToVelocity(mA))
	



	//Functions that build the values for both the outputted ADC values and the converted values in L/s for the Krohne measurer
	let expensive = _.map(lines, 2)
	expensive = _.filter(expensive, (e, i) => i % interval == 0)
	expensiveMA = _.map(expensive, e => f_p1_mA(parseInt(e)))
	
   	let expensiveLs = 0
	let expensiveMa = 0
	let expensiveMaSeries = []
	let expensiveLsSeries = []
	_.each(expensiveMA, v => {
		if(maToVelocity(v) < 11) {
			expensiveLs += 0
		}else{
			expensiveLs += maToLitersExpensive(v)*0.0105*interval		//interval is 10.5ms
		}
		expensiveMa += v
		expensiveMaSeries.push(expensiveMa)
		expensiveLsSeries.push(expensiveLs)
		
	})



    
    // f_p2_flow = mA => 22.5 * mA -70 // cm/s
	//Functions that build the values for both the outputted ADC values and the converted values in L/s for the Wenglor measurer
	let cheap = _.map(lines, 3)
	cheap = _.filter(cheap, (e, i) => i % interval == 0)
	cheapMA = _.map(cheap, e => f_p2_mA(parseInt(e)))
	
   	let cheapLs = 0
	let cheapMa = 0
	let cheapMaSeries = []
	let cheapLsSeries = []
	_.each(cheapMA, v => {
		if(maToVelocity(v) < 11) {
			cheapLs += 0
		}else{
			cheapLs += maToLitersCheap(v)*0.0105*interval		//interval is 10.5ms
		}
		cheapMa += v
		cheapLsSeries.push(cheapLs)
		cheapMaSeries.push(cheapMa)
	})
	
	
	//Calculations for the differences in measurements between the two measurers.
	let diff = expensiveLs-cheapLs
	let diffMa = expensiveMa-cheapMa
	l("\n\n")
	l("cheap Ls : expensive Ls ratio: " + cheapLs/expensiveLs)
	l("\n\n")
	l("cheap mA : expensive mA ratio: " + cheapMa/expensiveMa)
	l("% diff mA" + (1-cheapMa/expensiveMa)*100 + "%")

	l("% diff Ls" + (1-cheapLs/expensiveLs)*100 + "%")
    l("sumExpen Ls: " + expensiveLs)
    l("sumCheap Ls: " + cheapLs)
	l("sumExpen mA: " + expensiveMa)
	l("sumCheap mA: " + cheapMa)
	l("avgExpen Ls: " + expensiveLs/expensive.length)
    l("avgCheap Ls: " + cheapLs/cheap.length)
	l("avgExpen mA: " + expensiveMa/expensive.length)
    l("avgCheap mA: " + cheapMa/cheap.length)

	let temp = _.map(lines, 4)
	temp = _.filter(temp, (e, i) => i % interval == 0)
	temp = _.map(temp, e => parseInt(e))
	
	let new_serie = [
		{
			"name"  : "ExpensiveMA"
			,"data" : expensiveMA
			,"color": "blue"
            ,"yAxis": 0
		},
		{
			"name"  : "CheapMA"
			,"data" : cheapMA
			,"color": "orange"
            ,"yAxis": 0
		},
		// {
		// 	"name"  : "Temperature"
		// 	,"data" : temp
		// 	,"color": "red"
         //    ,"yAxis": 0
		// },
		{
			"name"  : "expensiveLsSeries"
			,"data" : expensiveLsSeries
			,"color": "lightblue"
			,"yAxis": 1
		},
        {
            "name"  : "cheapLsSeries"
            ,"data" : cheapLsSeries
            ,"color": "pink"
            ,"yAxis": 1
        },
		{
			"name"  : "cheapMaSeries"
            ,"data" : cheapMaSeries
            ,"color": "red"
            ,"yAxis": 1
		},{
			"name"  : "expensiveMaSeries"
            ,"data" : expensiveMaSeries
            ,"color": "yellow"
            ,"yAxis": 1
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
		max: XMAX,
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
            text : "Sum"
        },
        opposite: true
    }],

	series : [{
		"name" : "No file chosen",
		"data" : []
	}]
})

















