nw.Window.get().showDevTools();

// Modules
var jsonfile = require('jsonfile');
var autobahn = require('autobahn');
var hmac = require("crypto-js/hmac-sha512");

// Based values
var wsuri = "wss://api.poloniex.com";
var file = 'config.json';


var app = angular.module('app', []);
app.controller('TasksController', function($scope) {
	
	$scope.secret = "";
	$scope.apikey = "";
	
	$scope.tasks = [];
	$scope.msgSteck = [];
	
	$scope.newTask = {};
	
	$scope.balanceRAW = {};
	
	$scope.youHave = "";
	
	$scope.connectionOpened = false;
	
	function init() {
		// Lоad conFig
		jsonfile.readFile(file, function(err, obj) {
			$scope.apikey =  obj.apikey;
			$scope.secret =  obj.secret;
			
			connection.open();
			balance();
		});
	};
	init();
	
	// Save config
	$scope.saveConfig = function() {
		if($scope.apikey != null && $scope.secret != null) {
			console.log([$scope.apikey, $scope.secret]);
			
			var obj = {apikey: $scope.apikey, secret: $scope.secret}
			
			jsonfile.writeFile(file, obj, function (err) {
				$scope.msgSteck.push("Save config");
				console.log(err);
			});
		} else {
			$scope.msgSteck.push("Check config form");
			console.log("Check config form");
		};
	};
	
	$scope.addTask = function(type) {
		t = {
			type: type,
			pair:  $scope.newTask.pair,
			limit: $scope.newTask.limit,
			price: $scope.newTask.price,
			amount: $scope.newTask.amount,
			lastPrice: "Wait Poloniex...",
			isTrade: false
		};
		$scope.tasks.push(t);
	};
	
	$scope.removeTask = function(index) {
		$scope.tasks.splice(index, 1);
	};
	
	$scope.whatYouHave = function(pair) {
		arPair = pair.split("_");
		if(arPair.length == 2) {
			$scope.youHave = arPair[0] + ":" + $scope.balanceRAW[arPair[0]] + ", " + arPair[1] + ":" + $scope.balanceRAW[arPair[1]] ;
		} else {
			$scope.youHave = "";
		}
	};
	
	var connection = new autobahn.Connection({
		url: wsuri,
		realm: "realm1"
	});
	
	connection.onopen = function (session) {		
		console.log("Connection open");
		$scope.connectionOpened = true;
		function tickerEvent (args, kwargs) {
			console.log(args);
			for(i = 0; $scope.tasks.length > i; i++ ) {
				if(args[0] ==  $scope.tasks[i].pair) {
					$scope.tasks[i].lastPrice = args[1];
					if(!$scope.tasks[i].isTrade) {
						if($scope.tasks[i].type == "buy") {
							// BUY
							if($scope.tasks[i].lastPrice <= $scope.tasks[i].price) {
								$scope.tasks[i].isTrade = true;
								buy($scope.tasks[i].pair, $scope.tasks[i].price, $scope.tasks[i].amount);
							}
						} else {
							// SELL
							if($scope.tasks[i].lastPrice >= $scope.tasks[i].price) {
								$scope.tasks[i].isTrade = true;
								sell($scope.tasks[i].pair, $scope.tasks[i].price, $scope.tasks[i].amount);
							};
						};
					};
				};
			};
			$scope.$apply();
        };
		
		session.subscribe('ticker', tickerEvent);		
	};
	 
	connection.onclose = function (reason, details) {
		if($scope.connectionOpened) {
			console.log("Websocket connection closed");
			connection.open();
			$scope.connectionOpened = false;
		} else {
			console.log("Retry connection...");
			console.log(reason);
			console.log(details);
		};
	};
   
	
	
	function buy(pair, price, amount) {
		command = "command=buy&currencyPair="+pair+"&rate="+price+"&amount="+amount;
		post(command);
	};
	
	function sell(pair, price, amount) {
		command = "command=sell&currencyPair="+pair+"&rate="+price+"&amount="+amount;
		post(command);
	};
	
	function balance() {
		command = 'command=returnBalances';
		post(command, function(data){
			$scope.balanceRAW = data;
		});
	}
	
	function post(string, callback) {
		var basedUrl = "https://poloniex.com/tradingApi";
		var d = new Date();
		var n = d.getTime();
		string = string + "&nonce="+n;
		
		$.ajax({
			url: basedUrl,
			type:"POST",
			headers: { 
				"Key" : $scope.apikey,
				"Sign": getHash(string)
			},
			data:string,
			dataType:"json",
			success: function(data) {
				console.log(data);
				if(isFunction(callback)) {
					callback(data);
				}
			},
			error: function() {
				console.log('ajax error ! ');
			}
		}); 
	};
	
	function getHash(string){
		return hmac(string,  $scope.secret);
	
	};
	
	function isFunction(functionToCheck) {
		var getType = {};
		return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
	}
});
