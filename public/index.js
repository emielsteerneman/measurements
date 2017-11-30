l = console.log

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
	let duration = Math.round( (_.last(lines)[0] - lines[0][0]) / 1000 )
	
	let interval = Math.round(lines.length / 2000)
	// interval = 1

	app.graphInfo = {
		filename,
		duration,
		measurements : lines.length
	}

	let p1_4 = 532
	let p1_20=2758
	let p1_slope = 16/(p1_20-p1_4)
	let p1_b = 4 - p1_4 * p1_slope

	f_p1_mA = adc => adc * p1_slope + p1_b
	l(f_p1_mA(p1_4))
    l(f_p1_mA(p1_20))

	f_p1_flow = mA => 22.5 * mA -70 // cm/s

	let expensiveBaseline = 507.25
	let expensive = _.map(lines, 2)
	expensive = _.filter(expensive, (e, i) => i % interval == 0)
	expensive = _.map(expensive, e => f_p1_mA(parseInt(e)))

	let expensiveSum = 0
	let expensiveSumSeries = []
	_.each(expensive, v => {
		expensiveSum += v
        expensiveSumSeries.push(expensiveSum)
	})



    let p2_4 = 635
    let p2_20=2875
    let p2_slope = 16/(p2_20-p2_4)
    let p2_b = 4 - p2_4 * p2_slope

    f_p2_mA = adc => adc * p2_slope + p2_b

    // f_p2_flow = mA => 22.5 * mA -70 // cm/s

	let cheapBaseline = 635.8
	let cheap = _.map(lines, 3)
	cheap = _.filter(cheap, (e, i) => i % interval == 0)
	cheap = _.map(cheap, e => f_p2_mA(parseInt(e)))

    let cheapSum = 0
    let cheapSumSeries = []
    _.each(cheap, v => {
        cheapSum += v
        cheapSumSeries.push(cheapSum)
    })

	let diff = expensiveSum-cheapSum

	l("\n\n")
	l(cheapSum/expensiveSum)


	l((1-cheapSum/expensiveSum)*100 + "%")
    l("sumExpen " + expensiveSum)
    l("sumCheap " + cheapSum)

	l("avgExpen " + expensiveSum/expensive.length)
    l("avgCheap " + cheapSum/cheap.length)


	let temp = _.map(lines, 4)
	temp = _.filter(temp, (e, i) => i % interval == 0)
	temp = _.map(temp, e => parseInt(e))
	
	let new_serie = [
		{
			"name"  : "Expensive"
			,"data" : expensive
			,"color": "blue"
            ,"yAxis": 0
		},
		{
			"name"  : "Cheap"
			,"data" : cheap
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
			"name"  : "expensiveSumSeries"
			,"data" : expensiveSumSeries
			,"color": "lightblue"
			,"yAxis": 1
		},
        {
            "name"  : "cheapSumSeries"
            ,"data" : cheapSumSeries
            ,"color": "pink"
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
		min: -100,
		max: 2000,
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
        max: 1 * 10 * 1000,
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

















