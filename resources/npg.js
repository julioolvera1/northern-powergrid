/*!
 * ODI Leeds FES viewer
 */
var future;

S(document).ready(function(){

	// Main function
	function FES(file){

		this.scenario = "Community renewables";
		this.view = "LAD";
		this.key = (new Date()).getFullYear()+'';
		this.parameter = "ev";
		this.parameters = {
			'ev':{ 'title': 'Electric vehicles' }
		};
		this.logging = true;
		this.scenarios = null;
		this.scale = "relative";
		this.layers = {
			'LAD':{
				'file': 'data/maps/LAD-npg.geojson'
			},
			'primaries':{
				'file':'data/maps/primaries-unique.geojson'
			}
		}
		this.views = {
			'LAD':{
				'title':'Local Authorities',
				'file':'data/maps/LAD-npg.geojson',
				'source': 'primary',
				'layers':[{
					'id': 'LAD',
					'heatmap': true,
					'boundary':{'strokeWidth':2}
				}]
			},
			'primaries':{
				'title':'Primary Supply',
				'file':'data/maps/primaries-unique.geojson',
				'source': 'primary',
				'layers':[{
					'id': 'primaries',
					'heatmap': true,
				}]
			},
			'primariesLAD':{
				'title':'Primary Supply (with Local Authorities)',
				'source': 'primary',
				'layers':[{
					'id':'LAD',
					'heatmap': false,
					'boundary':{'color':'#444444','strokeWidth':1,"opacity":0.5,"fillOpacity":0}
				},{
					'id':'primaries',
					'heatmap': true,
				}]
			}
		};
		
		S().ajax("data/primaries2lad.json",{
			'this':this,
			'cache':false,
			'dataType':'json',
			'success': function(d){
				this.primary2lad = d;
				S().ajax("data/scenarios/index.json",{
					'this':this,
					'cache':false,
					'dataType':'json',
					'success': function(d){
						this.scenarios = d;
						this.init();
					},
					'error': function(e,attr){
						this.message('Unable to load '+attr.url.replace(/\?.*/,""),{'id':'error','type':'ERROR'});
					}
				});
			},
			'error': function(e,attr){
				this.message('Unable to load '+attr.url.replace(/\?.*/,""),{'id':'error','type':'ERROR'});
			}
		});

		return this;
	}

	FES.prototype.init = function(){

		if(this.scenarios && S('#scenarios').length==0){
			var html = "";
			for(var s in this.scenarios) html += "<option"+(this.scenario == s ? " selected=\"selected\"":"")+" class=\"b1-bg\" value=\""+s+"\">"+s+"</option>";	//  class=\""+this.scenarios[s].css+"\"
			S('#scenario-holder').html('<select id="scenarios">'+html+'</select>');
			S('#scenarios').on('change',{'me':this},function(e){
				e.preventDefault();
				e.data.me.setScenario(e.currentTarget.value);
			})
		}
		if(this.views && S('#view').length==0){
			var html = "";
			for(var l in this.views) html += "<option"+(this.view == l ? " selected=\"selected\"":"")+" value=\""+l+"\">"+this.views[l].title+"</option>";
			S('#view-holder').html('<select id="views">'+html+'</select>');
			S('#views').on('change',{'me':this},function(e){
				e.preventDefault();
				e.data.me.setView(e.currentTarget.value);
			})
		}
		if(this.parameters && S('#parameters').length==0){
			var html = "";
			for(var p in this.parameters) html += "<option"+(this.parameter == p ? " selected=\"selected\"":"")+" value=\""+p+"\">"+this.parameters[p].title+"</option>";
			S('#parameter-holder').html('<select id="parameters">'+html+'</select>');
		}

		// Add events to toggle switch		
		S('#scale-holder input').on('change',{me:this},function(e){
			e.preventDefault();
			e.data.me.setScale(e.currentTarget.checked ? "relative":"absolute");
		})
		S('#scale-holder .switch').on('click',{me:this},function(e){
			var el = S('#scale-holder input');
			el[0].checked = !el[0].checked;
			e.data.me.setScale(el[0].checked ? "relative":"absolute");
		})

		// Create the slider
		this.slider = document.getElementById('slider');
		noUiSlider.create(this.slider, {
			start: [parseInt(this.key)],
			step: 1,
			connect: true,
			range: {
				'min': 2017,
				'max': 2050
			},
			pips: {
				mode: 'values',
				stepped: true,
				values: [2020,2030,2040,2050],
				density: 3
			}
		});
		var _obj = this;
		// Bind the changing function to the update event.
		this.slider.noUiSlider.on('update', function () {
			_obj.setYear(''+parseInt(slider.noUiSlider.get()));
		});

		
		this.setScenario(this.scenario);
		
		return this;
	}
	
	FES.prototype.setScenario = function(scenario){

		// Set the scenario
		this.scenario = scenario;

		// Update the CSS class
		css = this.scenarios[scenario].css;
		S('header .title').attr('class','title '+css);
		S('#scenario .about').html(this.scenarios[scenario].description||'').attr('class','about padded '+css.replace(/-bg/,"-text"));
		S('#scenarios').attr('class',css);
		S('.scenario').attr('class','scenario '+css);
		S('header img').attr('src','https://odileeds.org/resources/images/odileeds-'+(css.replace(/[cs]([0-9]+)-bg/,function(m,p1){ return p1; }))+'.svg');
		S('.noUi-connect').attr('class','noUi-connect '+css);

		this.source = this.views[this.view].source;

		if(!this.scenarios[this.scenario].data[this.parameter][this.source].raw){
			// Load the file
			S().ajax("data/scenarios/"+this.scenarios[this.scenario].data[this.parameter][this.source].file,{
				'this':this,
				'cache':false,
				'dataType':'text',
				'scenario': this.scenario,
				'parameter': this.parameter,
				'success': function(d,attr){
					this.loadedData(d,attr.scenario,attr.parameter);
					this.buildMap();
				},
				'error': function(e,attr){
					this.message('Unable to load '+attr.url.replace(/\?.*/,""),{'id':'error','type':'ERROR'});
				}
			});
		}else{
			this.message('',{'id':'error'});
			// Re-draw the map
			this.buildMap();
		}

		return this;
	}

	FES.prototype.setView = function(v){
		if(this.views[v]){
			this.view = v;
			this.source = this.views[this.view].source;
			this.buildMap();
		}else{
			this.log.error('The view '+v+' does not exist!');
		}
		return this;
	}
	
	FES.prototype.setScale = function(v){
		this.scale = v;
		if(v=="relative") S('#scale-holder').removeClass('checked');
		else S('#scale-holder').addClass('checked');
		this.buildMap();
	}

	FES.prototype.setYear = function(y){
		if(this.map){
			this.key = y;
			this.buildMap();
		}
		S('.year').html(" ("+y+")");
		return this;
	}

	FES.prototype.loadedData = function(d,scenario,parameter){
	
		this.scenarios[scenario].data[parameter][this.source].raw = CSV2JSON(d,1);
		this.scenarios[scenario].data[parameter][this.source].primaries = {};
		this.scenarios[scenario].data[parameter][this.source].LAD = {};
		var r,c,v,p,lad;
		var key = "Primary";
		
		// Find the column number for the column containing the Primary name
		var col = -1;
		for(i = 0; i < this.scenarios[scenario].data[parameter][this.source].raw.fields.name.length; i++){
			if(this.scenarios[scenario].data[parameter][this.source].raw.fields.name[i] == key) col = i;
		}
		if(col >= 0){
			for(r = 0; r < this.scenarios[scenario].data[parameter][this.source].raw.rows.length; r++){
				// The primary key
				pkey = this.scenarios[scenario].data[parameter][this.source].raw.rows[r][col];
				this.scenarios[scenario].data[parameter][this.source].primaries[pkey] = {};
				for(c = 0; c < this.scenarios[scenario].data[parameter][this.source].raw.fields.name.length; c++){
					if(c != col){
						v = parseFloat(this.scenarios[scenario].data[parameter][this.source].raw.rows[r][c]);
						this.scenarios[scenario].data[parameter][this.source].primaries[pkey][this.scenarios[scenario].data[parameter][this.source].raw.fields.name[c]] = (typeof v==="number") ? v : this.scenarios[scenario].data[parameter][this.source].raw.rows[r][c];
					}
				}
			}
			// Convert to LADs
			// For each primary
			for(p in this.scenarios[scenario].data[parameter][this.source].primaries){
				if(this.primary2lad[p]){
					// Loop over the LADs for this primary
					for(lad in this.primary2lad[p]){
						// Loop over each key
						for(key in this.scenarios[scenario].data[parameter][this.source].primaries[p]){
							// Zero the variable if necessary
							if(!this.scenarios[scenario].data[parameter][this.source].LAD[lad]) this.scenarios[scenario].data[parameter][this.source].LAD[lad] = {};
							if(!this.scenarios[scenario].data[parameter][this.source].LAD[lad][key]) this.scenarios[scenario].data[parameter][this.source].LAD[lad][key] = 0;
							// Sum the fractional amount for this LAD/Primary
							this.scenarios[scenario].data[parameter][this.source].LAD[lad][key] += this.primary2lad[p][lad]*this.scenarios[scenario].data[parameter][this.source].primaries[p][key];
						}
					}
				}
			}
			
		}
		
		return this;
	}

	FES.prototype.buildMap = function(){

		var bounds = L.latLngBounds(L.latLng(56.01680,2.43896),L.latLng(52.82268,-5.603027));
		
		function makeMarker(colour){
			return L.divIcon({
				'className': '',
				'html':	'<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="7.0556mm" height="11.571mm" viewBox="0 0 25 41.001" id="svg2" version="1.1"><g id="layer1" transform="translate(1195.4,216.71)"><path style="fill:%COLOUR%;fill-opacity:1;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.1;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" d="M 12.5 0.5 A 12 12 0 0 0 0.5 12.5 A 12 12 0 0 0 1.8047 17.939 L 1.8008 17.939 L 12.5 40.998 L 23.199 17.939 L 23.182 17.939 A 12 12 0 0 0 24.5 12.5 A 12 12 0 0 0 12.5 0.5 z " transform="matrix(1,0,0,1,-1195.4,-216.71)" id="path4147" /><ellipse style="opacity:1;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:1.428;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" id="path4173" cx="-1182.9" cy="-204.47" rx="5.3848" ry="5.0002" /></g></svg>'.replace(/%COLOUR%/,colour||"#000000"),
				iconSize:	 [25, 41], // size of the icon
				shadowSize:	 [41, 41], // size of the shadow
				iconAnchor:	 [12.5, 41], // point of the icon which will correspond to marker's location
				shadowAnchor: [12.5, 41],	// the same for the shadow
				popupAnchor:	[0, -41] // point from which the popup should open relative to the iconAnchor
			});
		}

		if(!this.map){
			var mapel = S('#map');
			var mapid = mapel.attr('id');
			this.map = L.map(mapid,{'scrollWheelZoom':true}).fitBounds(bounds);
			this.map.attributionControl._attributions = {};
			this.map.attributionControl.addAttribution('Vis: <a href="https://odileeds.org/projects/">ODI Leeds</a>, Data: <a href="https://cms.npproductionadmin.net/generation-availability-map">Northern Powergrid</a>');
			
			// CartoDB map
			L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
				attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
				subdomains: 'abcd',
				maxZoom: 19
			}).addTo(this.map);
		}

		var _obj = this;
		var color = (this.scenarios[this.scenario].color||"#000000");

		if(!this.scenarios[this.scenario].data[this.parameter][this.source].raw){
			console.error('Scenario '+this.scenario+' not loaded');
			return this;
		}
		
		var min = 0;
		var max = 1;
		var _obj = this;
		var _scenario = this.scenarios[this.scenario].data[this.parameter][this.source];

		if(_scenario[this.view]){
			var min = 1e100;
			var max = -1e100;
			for(i in _scenario[this.view]){
				v = _scenario[this.view][i][this.key];
				if(typeof v==="number"){
					min = Math.min(v,min);
					max = Math.max(v,max);
				}
			}
		}

		if(this.map){

			var gotlayers = true;

			for(var l = 0 ; l < this.views[this.view].layers.length; l++){

				layer = this.views[this.view].layers[l];

				if(!this.layers[layer.id].data){

					// Show the spinner
					S('#map .spinner').css({'display':''});

					S().ajax(this.layers[layer.id].file,{
						'this':this,
						'cache':false,
						'dataType':'json',
						'view': this.view,
						'id': layer.id,
						'complete': function(d,attr){
							this.layers[attr.id].data = d;
							this.buildMap();
						},
						'error': function(e,attr){
							this.message('Unable to load '+attr.url.replace(/\?.*/,""),{'id':'error','type':'ERROR'});
						}
					});
				}
				if(!this.layers[layer.id].data) gotlayers = false;

			}

			if(!gotlayers){
				return this;
			}else{
			
				_geojson = [];
				
				// Remove existing layers
				for(var l in this.layers){
					if(this.layers[l].layer){
						this.layers[l].layer.remove();
						delete this.layers[l].layer;
					}
				}

				// Make copies of variables we'll use inside functions
				var _scenario = this.scenarios[this.scenario].data[this.parameter][this.source];
				var _obj = this;

				// Re-build the layers for this view
				for(var l = 0; l < this.views[this.view].layers.length; l++){
					
					var highlightFeature = function(e){
						var layer = e.target;
						layer.setStyle({
							weight: 2,
							color: color,
							fillColor: color,
							opacity: 1
						});
						if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
					}

					var resetHighlight = function(e){
						for(var l = 0; l < _geojson.length; l++) _geojson[l].resetStyle(e.target);
					}
					
					this.views[this.view].layers[l].geoattr = {
						"style": {
							"color": (this.views[this.view].layers[l].boundary ? this.views[this.view].layers[l].boundary.color||color : color),
							"opacity": (this.views[this.view].layers[l].boundary ? this.views[this.view].layers[l].boundary.opacity||1 : 1),
							"weight": (this.views[this.view].layers[l].boundary ? this.views[this.view].layers[l].boundary.strokeWidth||0.5 : 0.5),
							"fillOpacity": (this.views[this.view].layers[l].boundary ? this.views[this.view].layers[l].boundary.fillOpacity||0 : 0),
							"fillColor": (this.views[this.view].layers[l].boundary ? this.views[this.view].layers[l].boundary.fillColor||color : color)
						}
					};

					var _id = this.views[this.view].layers[l].id;

					if(this.views[this.view].layers[l].heatmap){

						var _l = l;
						this.views[this.view].layers[l].range = {'min':0,'max':1};
						view = this.views[this.view].layers[l].id;

						if(_scenario[view]){
							this.views[this.view].layers[l].range = {'min':1e100,'max':-1e100};
							for(i in _scenario[view]){

								keys = [];
								if(this.scale == "absolute"){
									for(k in _scenario[view][i]){
										if(parseInt(k)==k) keys.push(k);
									}
								}else{
									keys.push(this.key);
								}

								for(k = 0; k < keys.length; k++){
									v = _scenario[view][i][keys[k]];
									if(typeof v==="number"){
										this.views[this.view].layers[l].range.min = Math.min(v,this.views[this.view].layers[l].range.min);
										this.views[this.view].layers[l].range.max = Math.max(v,this.views[this.view].layers[l].range.max);
									}
								}
							}
						}
						
						// Get a nicer range
						this.views[this.view].layers[l].range = niceRange(this.views[this.view].layers[l].range.min,this.views[this.view].layers[l].range.max);
						// Update the scale bar
						S('#scale').html(makeScaleBar(getRGBAstr(color,0.0),getRGBAstr(color,0.8),{
							'min': this.views[this.view].layers[l].range.min,
							'max': this.views[this.view].layers[l].range.max,
							'weight': this.views[this.view].layers[l].geoattr.style.weight,
							'color': this.views[this.view].layers[l].geoattr.style.color
						}));
						
						// Define the GeoJSON attributes for this layer
						this.views[this.view].layers[l].geoattr.style = function(feature){
							var layer = _obj.views[_obj.view].layers[_l];
							var props = {
								"color": (layer.boundary ? layer.boundary.color||color : color),
								"fillColor": (layer.boundary ? layer.boundary.fillColor||color : color)
							};
							if(feature.geometry.type == "Polygon" || feature.geometry.type == "MultiPolygon"){
								var v = 0;
								var data = _scenario[layer.id];
								if(layer.id=="LAD"){
									// Need to convert primaries to LAD
									if(data[feature.properties.lad19cd]) v = (data[feature.properties.lad19cd][_obj.key]-layer.range.min)/(layer.range.max-layer.range.min);
								}else if(layer.id=="primaries"){
									v = (data[feature.properties.Primary][_obj.key] - layer.range.min)/(layer.range.max - layer.range.min);
								}
								v *= 0.8; // Maximum opacity
								props.weight = (layer.boundary ? layer.boundary.strokeWidth||1 : 1);
								props.opacity = 0.1;
								props.fillOpacity = v;
							}
							return props;
						};

						this.views[this.view].layers[l].geoattr.onEachFeature = function(feature, layer){
							var popup = popuptext(feature,{'this':_obj,'layer':_l});
							attr = {
								'mouseover':highlightFeature,
								'mouseout': resetHighlight,
							}
							if(popup) layer.bindPopup(popup);
							layer.on(attr);
						}
					}

				}

				for(var l = 0; l < this.views[this.view].layers.length; l++){

					id = this.views[this.view].layers[l].id
					this.layers[id].layer = L.geoJSON(this.layers[id].data,this.views[this.view].layers[l].geoattr);
					_geojson.push(this.layers[id].layer);

					if(this.layers[id].layer){
						this.layers[id].layer.addTo(this.map);
						S('#map .spinner').css({'display':'none'});
					}
					this.layers[id].layer.setStyle(this.views[this.view].layers[l].geoattr.style);
				}
			}
		}
		

		function popuptext(feature,attr){
			// does this feature have a property named popupContent?
			popup = '';
			me = attr['this'];
			var view = me.views[me.view].layers[attr.layer].id;
			key = feature.properties[(view=="LAD" ? "lad19cd" : "Primary")];
			v = 0;
			if(me.scenarios[me.scenario].data[me.parameter][me.source][view] && me.scenarios[me.scenario].data[me.parameter][me.source][view][key]){
				v = me.scenarios[me.scenario].data[me.parameter][me.source][view][key][me.key];
			}
			title = '?';
			added = 0;
			if(feature.properties){
				if(feature.properties.Primary || feature.properties.lad19nm) title = (feature.properties.Primary || feature.properties.lad19nm);
				/*if(feature.properties.lad19cd){
					popup += (added > 0 ? '<br />':'')+'<strong>Code:</strong> '+feature.properties.lad19cd;
					added++;
				}*/
			}
			popup += (added > 0 ? '<br />':'')+'<strong>'+me.parameters[me.parameter].title+' '+me.key+':</strong> '+v.toFixed(2);
			if(title) popup = '<h3>'+(title)+'</h3>'+popup;
			return popup;
		}

		return this;

	}
	
	FES.prototype.log = function(){
		if(this.logging || arguments[0]=="ERROR"){
			var args = Array.prototype.slice.call(arguments, 0);
			if(console && typeof console.log==="function"){
				if(arguments[0] == "ERROR") console.error('%cFES%c: '+args[1],'font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
				else if(arguments[0] == "WARNING") console.warning('%cFES%c: '+args[1],'font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
				else console.log('%cFES%c: '+args[1],'font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
			}
		}
		return this;
	};

	FES.prototype.message = function(msg,attr){
		if(!attr) attr = {};
		if(!attr.id) attr.id = 'default';
		if(!attr['type']) attr['type'] = 'message';
		if(msg) this.log(attr['type'],msg);
		var css = "b5-bg";
		if(attr['type']=="ERROR") css = "c12-bg";
		if(attr['type']=="WARNING") css = "c14-bg";

		var msgel = S('.message');
		if(msgel.length == 0){
			S('#scenario').before('<div class="message"></div>');
			msgel = S('.message');
		}
	
		if(!msg){
			if(msgel.length > 0){
				// Remove the specific message container
				if(msgel.find('#'+attr.id).length > 0) msgel.find('#'+attr.id).remove();
				//msgel.find('#'+attr.id).parent().removeClass('padded');
			}
		}else if(msg){
			// Pad the container
			//msgel.parent().addClass('padded');
			// We make a specific message container
			if(msgel.find('#'+attr.id).length==0) msgel.append('<div id="'+attr.id+'"><div class="holder padded"></div></div>');
			msgel = msgel.find('#'+attr.id);
			msgel.attr('class',css).find('.holder').html(msg);
		}

		return this;
	};


	// Useful functions


	function niceSize(b){
		if(b > 1e12) return (b/1e12).toFixed(2)+" TB";
		if(b > 1e9) return (b/1e9).toFixed(2)+" GB";
		if(b > 1e6) return (b/1e6).toFixed(2)+" MB";
		if(b > 1e3) return (b/1e3).toFixed(2)+" kB";
		return (b)+" bytes";
	}

	/**
	 * CSVToArray parses any String of Data including '\r' '\n' characters,
	 * and returns an array with the rows of data.
	 * @param {String} CSV_string - the CSV string you need to parse
	 * @param {String} delimiter - the delimeter used to separate fields of data
	 * @returns {Array} rows - rows of CSV where first row are column headers
	 */
	function CSVToArray (CSV_string, delimiter) {
		delimiter = (delimiter || ","); // user-supplied delimeter or default comma

		var pattern = new RegExp( // regular expression to parse the CSV values.
			( // Delimiters:
				"(\\" + delimiter + "|\\r?\\n|\\r|^)" +
				// Quoted fields.
				"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
				// Standard fields.
				"([^\"\\" + delimiter + "\\r\\n]*))"
			), "gi"
		);

		var rows = [[]];  // array to hold our data. First row is column headers.
		// array to hold our individual pattern matching groups:
		var matches = false; // false if we don't find any matches
		// Loop until we no longer find a regular expression match
		while (matches = pattern.exec( CSV_string )) {
			var matched_delimiter = matches[1]; // Get the matched delimiter
			// Check if the delimiter has a length (and is not the start of string)
			// and if it matches field delimiter. If not, it is a row delimiter.
			if (matched_delimiter.length && matched_delimiter !== delimiter) {
				// Since this is a new row of data, add an empty row to the array.
				rows.push( [] );
			}
			var matched_value;
			// Once we have eliminated the delimiter, check to see
			// what kind of value was captured (quoted or unquoted):
			if (matches[2]) { // found quoted value. unescape any double quotes.
				matched_value = matches[2].replace(
					new RegExp( "\"\"", "g" ), "\""
				);
			} else { // found a non-quoted value
				matched_value = matches[3];
			}
			// Now that we have our value string, let's add
			// it to the data array.
			rows[rows.length - 1].push(matched_value);
		}
		return rows; // Return the parsed data Array
	}

	// Function to parse a CSV file and return a JSON structure
	// Guesses the format of each column based on the data in it.
	function CSV2JSON(data,start,end){

		// If we haven't sent a start row value we assume there is a header row
		if(typeof start!=="number") start = 1;
		// Split by the end of line characters
		if(typeof data==="string") data = CSVToArray(data);
		// The last row to parse
		if(typeof end!=="number") end = data.length;

		if(end > data.length){
			// Cut down to the maximum length
			end = data.length;
		}


		var line,datum,header,types;
		var newdata = new Array();
		var formats = new Array();
		var req = new Array();

		for(var i = 0, rows = 0 ; i < end; i++){

			// If there is no content on this line we skip it
			if(data[i] == "") continue;

			line = data[i];

			datum = new Array(line.length);
			types = new Array(line.length);

			// Loop over each column in the line
			for(var j=0; j < line.length; j++){

				// Remove any quotes around the column value
				datum[j] = (line[j][0]=='"' && line[j][line[j].length-1]=='"') ? line[j].substring(1,line[j].length-1) : line[j];

				// If the value parses as a float
				if(typeof parseFloat(datum[j])==="number" && parseFloat(datum[j]) == datum[j]){
					types[j] = "float";
					// Check if it is actually an integer
					if(typeof parseInt(datum[j])==="number" && parseInt(datum[j])+"" == datum[j]){
						types[j] = "integer";
						// If it is an integer and in the range 1700-2100 we'll guess it is a year
						if(datum[j] >= 1700 && datum[j] < 2100) types[j] = "year";
					}
				}else if(datum[j].search(/^(true|false)$/i) >= 0){
					// The format is boolean
					types[j] = "boolean";
				}else if(datum[j].search(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/) >= 0){
					// The value looks like a URL
					types[j] = "URL";
				}else if(!isNaN(Date.parse(datum[j]))){
					// The value parses as a date
					types[j] = "datetime";
				}else{
					// Default to a string
					types[j] = "string";
					// If the string value looks like a time we set it as that
					if(datum[j].search(/^[0-2]?[0-9]\:[0-5][0-9]$/) >= 0) types[j] = "time";
				}
			}

			if(i == 0 && start > 0) header = datum;
			if(i >= start){
				newdata[rows] = datum;
				formats[rows] = types;
				rows++;
			}
		}
		
		// Now, for each column, we sum the different formats we've found
		var format = new Array(header.length);
		for(var j = 0; j < header.length; j++){
			var count = {};
			var empty = 0;
			for(var i = 0; i < newdata.length; i++){
				if(!newdata[i][j]) empty++;
			}
			for(var i = 0 ; i < formats.length; i++){
				if(!count[formats[i][j]]) count[formats[i][j]] = 0;
				count[formats[i][j]]++;
			}
			var mx = 0;
			var best = "";
			for(var k in count){
				if(count[k] > mx){
					mx = count[k];
					best = k;
				}
			}
			// Default
			format[j] = "string";

			// If more than 80% (arbitrary) of the values are a specific format we assume that
			if(mx > 0.8*newdata.length) format[j] = best;

			// If we have a few floats in with our integers, we change the format to float
			if(format[j] == "integer" && count['float'] > 0.1*newdata.length) format[j] = "float";

			req.push(header[j] ? true : false);

		}
		

		// Return the structured data
		return { 'fields': {'name':header,'title':clone(header),'format':format,'required':req }, 'rows': newdata };
	}

	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}


	String.prototype.regexLastIndexOf = function(regex, startpos) {
		regex = (regex.global) ? regex : new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
		if(typeof (startpos) == "undefined") {
			startpos = this.length;
		} else if(startpos < 0) {
			startpos = 0;
		}
		var stringToWorkWith = this.substring(0, startpos + 1);
		var lastIndexOf = -1;
		var nextStop = 0;
		while((result = regex.exec(stringToWorkWith)) != null) {
			lastIndexOf = result.index;
			regex.lastIndex = ++nextStop;
		}
		return lastIndexOf;
	}

	function makeScaleBar(a,b,attr){
		if(!attr) attr = {};
		if(!attr.min) attr.min = 0;
		if(!attr.max) attr.max = 0;
		return '<div class="bar" style="'+makeGradient(a,b)+';border:'+attr.weight+'px solid '+attr.color+'"></div><span class="min" style="border-left:'+attr.weight+'px solid '+attr.color+'">'+attr.min.toLocaleString()+'</span><span class="max" style="border-right:'+attr.weight+'px solid '+attr.color+'">'+attr.max.toLocaleString()+'</span>';
	}
	function makeGradient(a,b){
		if(!b) b = a;
		return 'background: '+a+'; background: -moz-linear-gradient(left, '+a+' 0%, '+b+' 100%);background: -webkit-linear-gradient(left, '+a+' 0%,'+b+' 100%);background: linear-gradient(to right, '+a+' 0%,'+b+' 100%);';
	}
	function getRGBAstr(c,a){
        a = (typeof a==="number" ? a : 1.0);
        var rgb = "rgba(0,0,0,1)";
        if(c.indexOf("rgb")==0) rgb = c.replace(/^rgba?\(([0-9]+),([0-9]+),([0-9]+),?([0-9\.]+)?\)$/,function(m,p1,p2,p3,p4){ return "rgba("+p1+","+p2+","+p3+","+p4+")"; });
        else if(c.indexOf('#')==0) rgb = "rgba("+parseInt(c.substr(1,2),16)+","+parseInt(c.substr(3,2),16)+","+parseInt(c.substr(5,2),16)+","+a+")";
        return rgb;
    }
	function niceRange(mn,mx){

		var dv,log10_dv,base,frac,options,distance,imin,tmin,i;
		n = 20;

		// Start off by finding the exact spacing
		dv = (mx - mn)/n;

		// In any given order of magnitude interval, we allow the spacing to be
		// 1, 2, 5, or 10 (since all divide 10 evenly). We start off by finding the
		// log of the spacing value, then splitting this into the integer and
		// fractional part (note that for negative values, we consider the base to
		// be the next value 'down' where down is more negative, so -3.6 would be
		// split into -4 and 0.4).
		log10_dv = Math.log10(dv);
		base = Math.floor(log10_dv);
		frac = log10_dv - base;

		// We now want to check whether frac falls closest to 1, 2, 5, or 10 (in log
		// space). There are more efficient ways of doing this but this is just for clarity.
		options = [1,2,5,10];
		distance = new Array(options.length);
		imin = -1;
		tmin = 1e100;
		for(i = 0; i < options.length; i++){
			distance[i] = Math.abs(frac - Math.log10(options[i]));
			if(distance[i] < tmin){
				tmin = distance[i];
				imin = i;
			}
		}

		// Now determine the actual spacing
		var inc = Math.pow(10,base) * options[imin];

		return {'min': Math.floor(mn/inc) * inc, 'max': Math.ceil(mx/inc) * inc};
	}
	// Define a new instance of the FES
	future = new FES();
	
});