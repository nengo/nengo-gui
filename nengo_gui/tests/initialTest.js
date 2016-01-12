describe('Initial test', function(){
	var d = "hello"
	
	it('should equal hello',function(){
		var webdriver = require('selenium-webdriver');

		var driver = new webdriver.Builder().
		   withCapabilities(webdriver.Capabilities.chrome()).
		   build();
		var testCode = "import nengo model = nengo.Network()with model: stim = nengo.Node([0]) a = nengo.Ensemble(n_neurons=50, dimensions=1) nengo.Connection(stim, a)"
		driver.get('localhost:8080/?filename=nengo_gui/nengo_gui/examples/default.py');
		driver.sleep(4000)
		var textarea = $('#content');
		expect(textarea.val().replace(/\s/g, '')).toBe(testCode.replace(/\s/g, ''))
	});
});