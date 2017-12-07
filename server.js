l = console.log
process.stdout.write('\033c');
l('Running')


let express = require('express')
let _ 	    = require('lodash')
let fs      = require('fs-extra')
let path    = require('path')


let app    = express()
let server = require('http').createServer(app)

app.use('/', express.static(path.join(__dirname, 'public')))

app.get('/getListOfMeasurements', (req, res, next) => {
	fs.readdir('measurements', (err, files) => {
		l("hffhhjtcj")
		l(files)
		res.send(JSON.stringify(files))
	})
})

app.use('/', (req, res, next) => {
	l("Request for file " + req.url)
	next()
})
app.use('/', express.static(path.join(__dirname, 'measurements')))

server.listen(3000, function(){
    l('Listening')
})