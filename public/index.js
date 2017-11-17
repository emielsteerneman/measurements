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
	
	app.graphInfo = {
		filename,
		duration,
		measurements : lines.length
	}
	
	let expensive = _.map(lines, 2)
	expensive = _.filter(expensive, (e, i) => i % interval == 0)
	expensive = _.map(expensive, e => parseInt(e))
	
	let cheap = _.map(lines, 3)
	cheap = _.filter(cheap, (e, i) => i % interval == 0)
	cheap = _.map(cheap, e => parseInt(e))
	
	let temp = _.map(lines, 4)
	temp = _.filter(temp, (e, i) => i % interval == 0)
	temp = _.map(temp, e => parseInt(e))
	
	let new_serie = [
		{
			"name"  : "Expensive"
			,"data" : expensive
			,"color": "blue"
		},
		{
			"name"  : "Cheap"
			,"data" : cheap
			,"color": "orange"
		},
		{
			"name"  : "Temperature"
			,"data" : temp
			,"color": "red"
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
		max: 2000,
		labels: {
			enabled: false
		}
	},
	yAxis: {
		min: 450,
		max: 3000,
		title : {
			text : "ADC Values"
		}
	},
	series : [{
		"name" : "No file chosen",
		"data" : []
	}]
})

















