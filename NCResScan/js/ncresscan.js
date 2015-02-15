//NCResScan.js
/*
* 	Functions for the NCResScan web mapping applicaiton
*	DATE: FEB 2013
*/
console.log("Welcome to NCResScan.js");
console.log(Date());

dojo.require("esri.map");
dojo.require("esri.layers.FeatureLayer");
dojo.require("esri.tasks.query");
dojo.require("esri.tasks.gp");
dojo.require("esri.dijit.Popup");
dojo.require("esri.dijit.Geocoder");
dojo.require("esri.tasks.locator");
dojo.require("esri.layers.osm");
dojo.require("esri.dijit.Legend");
dojo.require("dijit.TitlePane");
dojo.require("esri.dijit.BasemapGallery");

// Setup Vars
var layer, map, ncresscanGP, ncresImpactGP, visible = [];
var mapLyrs=[];
var legendLayers = [];
var counties, subs, hucs;
var geocoder, locator, osmLayer, legendDijit;
// GPService Result Map Service for output DEM
var reservoirMPServiceURL = "http://152.19.196.69:6080/arcgis/rest/services/testing/ncreservoir/MapServer/jobs";

var config = {
  server: "http://152.19.196.69",
  port: "6080",
  restServices: "arcgis/rest/services/",
  folder: "testing",
  baseMapService: "NCRes_MapService/MapServer",
  baseMapServiceURL: "http://152.19.196.69:6080/arcgis/rest/services/testing/NCRes_MapService/MapServer",
  reservoirGPService: "ncreservoir/GPServer/reservoir",
  impactAnalysiGPService: "ImpactAnalysis2/GPServer/ImpactAnalysis1",
  getHucIdURL:"http://152.19.196.69:6080/arcgis/rest/services/testing/allHucOne/MapServer/0",
  reservoirMPServiceURL:"http://152.19.196.69:6080/arcgis/rest/services/testing/ncreservoir/MapServer/jobs",
  reservoirGPSrvcURL:"http://152.19.196.69:6080/arcgis/rest/services/testing/ncreservoir/GPServer/reservoir",
  impactGPSrvcURL:"http://152.19.196.69:6080/arcgis/rest/services/testing/ImpactAnalysis2/GPServer/ImpactAnalysis1",
  getRestURL:"http://152.19.196.69:6080/arcgis/rest/services/testing/"
};

var openImgUrl='/NCResScan/imgs/open.png';
var closeImgUrl='/NCResScan/imgs/close.png';

var ncResScan={};
ncResScan['session']=null;
ncResScan['config']=config;

ncResScan['jobs']=[];
ncResScan['currLat']= 'xxx';
ncResScan['currLng']= 'xxx';
ncResScan['currAddr']= 'xxx';
ncResScan['currCity']= 'xxx';
ncResScan['currState']= 'xxx';
ncResScan['currZip']= 'xxx';

var loc = {};

// loc['sessionId']=null;

/*******************************************************************************
 * Debug & Test Area Timothy Morrissey
 * 
 */
// var myVar=setInterval(function(){myTimer()},1000);
// function myTimer(){
// var d=new Date();
// var t=d.toLocaleTimeString();
// //document.getElementById("demo").innerHTML=t;
// dojo.byId("demo").innerHTML=t;
// }
//$(document).ready(myTestWin);
var debugApp=function(flag){
    if (flag){
      alert("Debug Mode");
    	console.log(".....DEBUGGING....");
    	// $("#floatReport").load('html/report.html');
     	console.log(".....DEBUGGING....");
    }
	};

/**
* Cookie Apps
*/
function getCookie(c_name){
  var c_value = document.cookie;
  var c_start = c_value.indexOf(" " + c_name + "=");
  if (c_start == -1){c_start = c_value.indexOf(c_name + "=");}
  if (c_start == -1){
    c_value = null;
  } else {
    c_start = c_value.indexOf("=", c_start) + 1;
    var c_end = c_value.indexOf(";", c_start);
    if (c_end == -1){c_end = c_value.length;}
      c_value = unescape(c_value.substring(c_start,c_end));
  }
  return c_value;
}
function setCookie(c_name,value,exdays){
  var exdate=new Date();
  exdate.setDate(exdate.getDate() + exdays);
  var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
  document.cookie=c_name + "=" + c_value;
}

function checkNCResCookie(){
  var sessionId=getCookie("ncresScanId");
  if (sessionId!=null && sessionId!=""){
     //set the location object sessionID
     console.log("ncResScanId retrieved : " + sessionId);
  } else {
    //sessionId=prompt("Please enter your name:","");
    sessionId= new Date().getTime();
    setCookie("ncresScanId",sessionId,365);
    console.log("new ncResScanId created : " + sessionId);
  }
  //Set the JSON objects
  //loc.sessionId=sessionId;
  ncResScan.session=sessionId;
  //console.log("NCResScan sessionID : " + sessionId);
}
	
/**
 * NCResScan.js Timothy Morrissey
 */
function init(){
  console.log(arguments.callee.name);

	// DEBUGGING
	debugApp(true);

  //Check for the NCRes Session Cookie
  checkNCResCookie();
  console.log(ncResScan);
  console.log(ncResScan.config.baseMapService);
 
  // Get the MapService Layers -- should be all the layers used in the application -- needs to be allHucOne
  $.getJSON('http://152.19.196.69:6080/arcgis/rest/services/testing/NCRes_MapService/MapServer/layers?f=json', function(data) {
    $.each(data.layers, function(key, val){
        mapLyrs.push(val.name);
      })
    
  });

  map = new esri.Map("mapDiv", {
   	center: [-79.194,35.494],         // Lat\Lng
   	zoom: 8,
   	basemap: "gray",
  });
    
  //add the basemap gallery, in this case we'll display maps from ArcGIS.com including bing maps
  var basemapGallery = new esri.dijit.BasemapGallery({
    showArcGISBasemaps: true,
    map: map
  }, "basemapGallery");
  basemapGallery.startup();  
  dojo.connect(basemapGallery, "onError", function(msg) {console.log(msg)});


  // Legend -- ##WIP
  // dojo.connect(map, 'onLayerAddResult', function (layer) {
  //       console.log("Legend Creation ...");
  //       console.log(layer.url);
  //       // if (layerInfo.length > 0) {
  //       if (layer) {
  //       console.log(layer.url);
  //       var legendDijit = new esri.dijit.Legend({
  //           map       :map,
  //           // layerInfos:layerInfo
  //         }, "legendDiv");
  //         legendDijit.startup();
  //       }
  //     });

  // add the legend
  // var imageParameters = new esri.layers.ImageParameters();
  // imageParameters.layerIds = [];
  // imageParameters.layerOption = esri.layers.ImageParameters.LAYER_OPTION_SHOW;
  // layer = new esri.layers.ArcGISDynamicMapServiceLayer("http://152.19.196.69:6080/arcgis/rest/services/NCRes_MapService/MapServer",{"imageParameters":imageParameters}); //{opacity:0.5},
  // layer = new esri.layers.ArcGISDynamicMapServiceLayer("http://152.19.196.69:6080/arcgis/rest/services/NCRes_MapService/MapServer");
  layer = new esri.layers.ArcGISDynamicMapServiceLayer(ncResScan.config.baseMapServiceURL, {id:'ncresscanLyrs'});
  legendLayers.push({layer:layer,title:'NCResScan Layers'});
  console.log(layer);
  //alert(ncResScan.config.baseMapServiceURL);
  // layer = new esri.layers.ArcGISDynamicMapServiceLayer(ncResScan.config.baseMapServiceURL,{"imageParameters":imageParameters}); //{opacity:0.5},
  //layer = new esri.layers.ArcGISDynamicMapServiceLayer("http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Specialty/ESRI_StatesCitiesRivers_USA/MapServer", {"imageParameters":imageParameters});
  //map.addLayer(layer);
  
  if (layer.loaded) {
     buildLayerList(layer);
  } else {
     dojo.connect(layer, "onLoad", buildLayerList);
  }
  legendDijit = new esri.dijit.Legend({
            map:map,
            layerInfos:legendLayers
           }, "legendDiv");
          legendDijit.startup();
 
  // Get the HUC_ID from a MapService
	//queryTask = new esri.tasks.QueryTask("http://152.19.196.69:6080/arcgis/rest/services/testing/allHucOne/MapServer/0");
 //  query = new esri.tasks.Query();
	// query.returnGeometry = false;
	// query.outFields=["label"];
	// query.outSpatialReference = {"wkid":102100};  
  	
  	// Add all the NCReservoirMapService - Layers -- ## CONFIG ##
	
  
    
	//Create the GeoProcessor Task - NCResScan
	// ncresscanGP = new esri.tasks.Geoprocessor("http://152.19.196.69:6080/arcgis/rest/services/testing/ncreservoir/GPServer/reservoir");
  ncresscanGP = new esri.tasks.Geoprocessor(ncResScan.config.reservoirGPSrvcURL);
  //ncresscanGP.setOutputSpatialReference({wkid:102100});
  // dojo.connect(map, "onClick", computeReservoir);
        
  // ncresImpactGP = new esri.tasks.Geoprocessor("http://152.19.196.69:6080/arcgis/rest/services/testing/ImpactAnalysis2/GPServer/ImpactAnalysis1");
  ncresImpactGP = new esri.tasks.Geoprocessor(ncResScan.config.impactGPSrvcURL);
    
  // create the geocoder
  geocoder = new esri.dijit.Geocoder({ 
    	autoComplete: true,
      maxLocations: 5,
      map: map,
      arcgisGeocoder: {
            url: "http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
            name: "Esri Geocoder",
            placeholder: "Search for Location (Address, City, County, Zip)",
            suffix: " , North Carolina",
            sourceCountry: "USA" // limit search to the United States
          }
    	}, "search");
  geocoder.startup();
  


  //Reverse Geocoder
  locator = new esri.tasks.Locator("http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer");


  
  //INIT Event Handling - some jQuery some dojo
  /*******************************************************************************************
  *     Initialize the Event Handling behavior for DOM elements including map, services
  *
  ******************************************************************************************/

  // Reverse Geocoder event - sets the current location on the ncResScan object
  dojo.connect(locator, "onLocationToAddressComplete", function(candidate) {
              if (candidate.address) {
                 //this service returns geocoding results in geographic - convert to web mercator to display on map
                 var location = esri.geometry.geographicToWebMercator(candidate.location);
                 ncResScan['currAddr']= candidate.address;
                 ncResScan['currAddr'] = candidate.address.Address;
                 ncResScan['currCity'] = candidate.address.City;
                 ncResScan['currState'] = candidate.address.Region;
                 ncResScan['currZip'] = candidate.address.Postal; 
               }
      });

  
    // Map onLoad connect mouseOver to showLocat
    map.on("load", function(){
          //after map loads, connect to listen to mouse move & drag events
          map.on("mouse-move", showLocation);
          map.on("mouse-drag", showLocation);

          console.log("Map onLoad event");
           // Hook up jQuery
           $(document).ready(jQueryReady);
    });

    
	 // Capture the mouse click
	 //dojo.connect(map, "onClick", getLocation);

	 // ## ALTERNATE ONCLICK SCENARIOS
    dojo.connect(map, "onClick", getLocContext);
       //dojo.connect(map, "onDblClick", getLocContext);
    var damPtSymbol = new esri.symbol.PictureMarkerSymbol('/NCResScan/imgs/i_hydro.png', 24, 24)
    var graphic;
    dojo.connect(map, "onClick", function(evt) {
          console.log("Map onClick event");
          // Add a graphic at the clicked location
          if (graphic) {
            graphic.setGeometry(evt.mapPoint);
          }
          else {
            graphic = new esri.Graphic(evt.mapPoint, damPtSymbol);
            map.graphics.add(graphic);
          }
      });


    //Register ASynch JS deffereds
    //dojo.connect(ncresscanGP, "onGetResultDataComplete", displayTable);
    dojo.connect(ncresscanGP, "onGetResultImageLayerComplete", displayTable);
  
} //end of init


// Add Marker Symbol on Click jQuery 
// http://help.arcgis.com/en/webapi/javascript/arcgis/jssamples/#sample/framework_jquery
function jQueryReady() {
	var damPtSymJSON = {
			"type": "esriSMS",
			 "style": "esriSMSSquare",
			 "color": [99,99,99,255],
			 "size": 20,
			 "angle": 0,
			 "xoffset": 0,
			 "yoffset": 0,
			 "outline": 
			  {
				 "color": [128,0,0,1],
				   "width": 1
			  }
			};
	
    
  //Inital View State of Elements
  // Control Panel
  // $(".contentTitle").html("Welcome to the NC Res Scan " + ncResScan.session);
  $(".contentTitle").append(" " + ncResScan.session);
  $("#currentLocSection").show();
  $(".currLoc").show();

  $(".viewContrPanel").click(function(){
     $("#resScanContent").slideToggle("slow");
  });

  $(".viewLyrs").click(function(){
    var src = ($(".viewLyrs").attr('src') === closeImgUrl)
            ? openImgUrl
            : closeImgUrl;
      $(".viewLyrs").attr('src',src);

      $("#layer_list").slideToggle("slow");
      $("#legendDiv").slideToggle("slow");
  });

  $("#currentLocSection").click(function(){
    var src = ($(".viewLocImg").attr('src') === closeImgUrl)
            ? openImgUrl
            : closeImgUrl;
      $(".viewLocImg").attr('src',src);

      $(".currLoc").slideToggle("slow");
  });

  $(".viewReportImg").click(function(){
    var src = ($(".viewReportImg").attr('src') === closeImgUrl)
            ? openImgUrl
            : closeImgUrl;
        $(".viewReportImg").attr('src',src);
          
        $("#resScanReport").slideToggle("slow");
  });

  $(".viewJobImg").click(function(){
    var src = ($(".viewJobImg").attr('src') === closeImgUrl)
            ? openImgUrl
            : closeImgUrl;
         $(".viewJobImg").attr('src',src);

         $("#job").slideToggle("slow");
  });

  $(".viewStageReport").click(function(){
     var src = ($(".viewStageReport").attr('src') === closeImgUrl)
            ? openImgUrl
            : closeImgUrl;
      $(".viewStageReport").attr('src',src);

         $("#stageReport").slideToggle("slow");
  });

  $(".viewResScanForm").click(function(){
      $(".resScanForm").slideToggle("slow");
  });

  $(".viewImpatcImg").click(function(){alert(this);});
}

/**
* Build Dynamic Layers List
**/    
function buildLayerList(layer) {
  var items = dojo.map(layer.layerInfos,function(info,index){
      if (info.defaultVisibility) {
        visible.push(info.id);
      }
      return "<input type='checkbox' class='list_item'" + (info.defaultVisibility ? "checked=checked" : "") + "' id='" + info.id + "' onclick='updateLayerVisibility();' /><label for='" + info.id + "'>" + info.name + "</label>";
      });

  dojo.byId("layer_list").innerHTML = items.join(' ');
  //set the global
  //mapLyrs=items;
  layer.setVisibleLayers(visible);
  map.addLayer(layer);
   
}

/**
* Show/Hide Layers
**/
function updateLayerVisibility() {
    var inputs = dojo.query(".list_item"), input;

    visible = [];

    dojo.forEach(inputs,function(input){
      if (input.checked) {
          visible.push(input.id);
      }
    });
    //if there aren't any layers visible set the array to be -1
    if(visible.length === 0){
      visible.push(-1);
    }
    layer.setVisibleLayers(visible);
    legendDijit.refresh();
}      


/*
* Reverse Geocode current Map Point of the Event
* Set Elements with class = .currLoc to the value of Location of Event 
*/
function showLocation(evt) {
        // console.log("show");
        //get mapPoint from event
        //The map is in web mercator - modify the map point to display the results in geographic
        var mp = esri.geometry.webMercatorToGeographic(evt.mapPoint);
        //display mouse coordinates
        // dojo.byId("info").innerHTML = mp.x.toFixed(3) + ", " + mp.y.toFixed(3);

        //Reverse Geocode:
        // locator.locationToAddress(esri.geometry.webMercatorToGeographic(evt.mapPoint), 5000);
        locator.locationToAddress(mp, 5000);
        ncResScan.currLat = mp.y.toFixed(4);
        ncResScan.currLng = mp.x.toFixed(4);
        var currLocTxt = "Latitude / Longitude: " + ncResScan.currLat + " / " +  ncResScan.currLng + "<br />";
        currLocTxt += "Location: " + ncResScan.currCity + ", " + ncResScan.currState + " " + ncResScan.currZip + "<br />";
        $(".currLoc").html(currLocTxt); 
  }
//
//** ALTERNATE ONCLICK BEHAVIOR
//


function getLocContext(evt) {
    // var loc = {};
    console.log(arguments.callee.name); 
  
	//LocationContext Params
    //Initialize the Loc object - JSON
    //Need a JSON collection object for lyr data to retrieved below in a loop
    loc['location']=ncResScan.currCity + ncResScan.currState + ncResScan.currZip;
    loc['mpsrvcLyrs']=mapLyrs;
    loc['runStage']=false;
    loc['runImpact']=false;
    loc['area'];
    loc['volume'];
    loc['floodZoneLyr'];
//  loc['hucDem']=black_44;
    loc['damHt']=125;		//default damHt
    loc['jobId']=9999;
    var geoPt = esri.geometry.webMercatorToGeographic(evt.mapPoint);
  	// loc['lat'] = parseFloat(geoPt.y.toFixed(4));
  	// loc['lng'] = parseFloat(geoPt.x.toFixed(4));
  	loc['lat'] = parseFloat(geoPt.y);
    loc['lng'] = parseFloat(geoPt.x);
    map.centerAndZoom(evt.mapPoint,12);
  	//center and zoom
    // if (map.getZoom()> 12){
    //   map.centerAndZoom(evt.mapPoint,10);	
    // } else {
    //   map.centerAndZoom(evt.mapPoint,13);	
    // }
	
 
  	// var popUpContent;
  	// var lyrLocContext;
  	
  	//Get the HUC_ID to send to ncReservoirGP - ##Should be in Same Mapservice below###
  	//var hucQueryTask = new esri.tasks.QueryTask("http://152.19.196.69:6080/arcgis/rest/services/testing/allHucOne/MapServer/0");
    var hucQueryTask = new esri.tasks.QueryTask(ncResScan.config.getHucIdURL);
	  var hucQuery = new esri.tasks.Query();
	  hucQuery.geometry = evt.mapPoint;
    hucQuery.returnGeometry = false;
	  hucQuery.outFields=["label"];
    hucQuery.outSpatialReference = {"wkid":102100};
		  
	  hucQueryTask.execute(hucQuery);

	  var currentClick=null;
	  dojo.connect(hucQueryTask, "onComplete", function(hucQueryResults){
                currentClick=evt.mapPoint;
		            loc['hucDEM']=hucQueryResults.features[0].attributes.label;
		
                 console.log("job -> hucID : " + loc.hucDEM);
                 //Rough - 5km - Reverse Geocode mouse click
                // locator.locationToAddress(esri.geometry.webMercatorToGeographic(evt.mapPoint), 5000);

                ncResScan[loc]=loc;
    
                resscanReq(evt,loc);
                // resscanReq(evt);

                // buildReportWin();
  
	         });//end of OnComplete for hucQueryResult QueryTask

	
  	//Build the Location Context according to NCRes_MapService --## CONFIG ##
  	//loc['layers'] = 9;
  	//loc['layers'] = mapLyrs.length;//loc['county'] = 
  	//loc['subBasin']=
  	//Loop through all the layers in the MapServer to build the location context of map on click
  	//Need to get the # of Layers in a MapService.
  	//  	# of Layers
  	
    // $(".currLoc")
  	var currLocTxt = "Latitude / Longitude: " + loc.lat.toFixed(4)  + " / " +  loc.lng.toFixed(4)  + "<br />";
        // currLocTxt += "Address: <br />" + loc.addr + " " + loc.city + "," + loc.state + " " + loc.zip + "<br />";
        currLocTxt += "Location: " + ncResScan.currCity + "," + ncResScan.currState + " " + ncResScan.currZip + "<br />";
    $(".currLoc").html(currLocTxt); 
  	
  	
  	//console.log("Num of layers = " + loc.layers);
    //  	for (var i=0; i < loc['layers']; i++) {
    //  	  	var query = new esri.tasks.QueryTask("http://152.19.196.69:6080/arcgis/rest/services/testing/NCRes_MapService/MapServer/" + i);
    //  		  var queryParams = new esri.tasks.Query();
    //  		  queryParams.geometry = evt.mapPoint;
    //  		  //queryParams.outFields=["FID","RIVBASIN_N "];
    //  		  queryParams.spatialRelationship = esri.tasks.Query.SPATIAL_REL_ENVELOPEINTERSECTS
    //        // query.execute(queryParams, function(fset) {
    //        //       if (fset.features.length === 1) {
    //        //         showFeature(fset.features[0],evt);
    //        //       } else if (fset.features.length !== 0) {
    //        //         showFeatureSet(fset,evt);
    //        //       }
    //        // });
    //  		  query.execute(queryParams, function(queryResults){
    //      			var featureCount = queryResults.features.length;
    //      			console.log("The # of features = " + featureCount);
    //      			if (featureCount > 0) {
    //      				console.log(queryResults);
    //    //					console.log(queryResults.displayFieldName);
    //    //  	  			console.log(queryResults.features);
    //      				var featJSON =  queryResults.features[0].toJson();
    //      				for (var key in featJSON.attributes){
    //      					console.log('key = ' + key);
    //      					console.log('val = ' + featJSON.attributes[key]);
    //      					loc[key]=featJSON.attributes[key];
    //      				}
    //      			}
    //          });
    //  			
    ////   			console.log(loc);
    ////   			lyrLocContext = "<p>County : " + loc['NAME'] + " <a href='javascript:map.setZoom(10)'>zoom</a></p>";
    ////   			lyrLocContext += "<p>River Basin : " + loc['RIVBASIN_A'] + " <a href='javascript:map.setZoom(8)'>zoom</a></p>";
    ////   			lyrLocContext += "<p>Sub Basin : " + loc['HU_8_NAME'] + "</p>";
    //// 	  		lyrLocContext += "<p>Roads</p>";
    //// 	  		lyrLocContext += "<p>Interstate : " + loc['ROUTE_NUM'] + "</p>";	
    //// 	  		lyrLocContext += "<p>Park Name : " + loc['PK_NAME'] + "</p>";
    //// 	  		lyrLocContext += "<p>Screen Point (X) : " + evt.x + "</p>";	//evt.screenPoint.x
    //// 	  		console.log(evt);
    //// 	  		lyrLocContext += "<p>Screen Point (Y) : " + evt.y + "</p>";	
    //// 	  		lyrLocContext += "<p>Screen Point JSON :  " + evt.toJson() + "</p>";	
    //	  		
    //// 	  		// map.infoWindow.setContent(popUpContent); 
    //// //  	  		
    //
    ////   		  }); //query.execute
    //	   } // -- for loop over all map layers to get locational context for (var i=0; i < loc['layers']; i++) 
}

function resscanReq(evt,loc){
  // function resscanReq(evt){
  // console.log("resscanReq");
  console.log(arguments.callee.name); 
  
  var ncresInfoWin = "";
  ncresInfoWin += "<div id='doResScanInfoWin'>";
  // ncresInfoWin += "<p class='locDam'>Dam Location</p>";
  ncresInfoWin += "<div class='damLoc'>";
  ncresInfoWin += "Dam Location: <br />";
  ncresInfoWin += "<p>Latitude: "+ loc.lat.toFixed(4) + "<br />Longitude: " +  loc.lng.toFixed(4) + " <a href='javascript:map.setZoom(13)'>zoom</a></p>";
  // ncresInfoWin += "<p>Location: " + loc.city + "," + loc.state + " " + loc.zip + " <a href='javascript:map.setZoom(11)'>zoom</a></p>";
  // ncresInfoWin += "<p>Latitude / Longitude:: "+ ncResScan.currLoc + " <a href='javascript:map.setZoom(13)'>zoom</a></p>";
  ncresInfoWin += "<p>Location: " + ncResScan.currCity + "," + ncResScan.currState + " " + ncResScan.currZip + " <a href='javascript:map.setZoom(11)'>zoom</a></p>";
  ncresInfoWin += "</div>";  
  ncresInfoWin += "<p class='viewResScanForm'><img class='runResScanImg' src='"+ closeImgUrl + "'>Run Reservoir Scan</p>";
  ncresInfoWin += "<div class='resScanForm'>";
  ncresInfoWin += "<form id='doResScanForm'>Dam Height (ft): <input size='5' type='text' id='damHt' value='"+ loc.damHt+"'/><br />";
  ncresInfoWin += "<br /><input type='checkbox' id='runStage' name='Stage' value='Stage' />Run Stage Analysis<br />";
  ncresInfoWin += "<br /><input type='checkbox' id='runImpact' name='Impact' value='Impact Report' />Run Impact Analysis<br />";
  //Loop through layer list
  for (var i=0; i < mapLyrs.length; i++) { 
    ncresInfoWin += "<br />&nbsp;&nbsp;<input type='checkbox' class='list_item' id='" + mapLyrs[i] + "/><label for='" + mapLyrs[i]  + "'>" + mapLyrs[i]  + "</label>";
  }
  
  ncresInfoWin += "<p class='flip' onClick='computeReservoir()'>Compute Reservoir Model</p>";
  ncresInfoWin += "</div>";
  ncresInfoWin += "</div>";
 
  map.infoWindow.setTitle("NCResScan");
  map.infoWindow.show(evt.mapPoint);  
  map.infoWindow.setContent(ncresInfoWin);
  
  console.log("ncResScan object");
  console.log(ncResScan);
  // // $("#resScanForm").hide();//NOT WORKING WANT TO DEFAULT TO HIDE for FORM.  
   $(".viewResScanForm").click(function(){
      var src = ($(".runResScanImg").attr('src') === closeImgUrl)
            ? openImgUrl
            : closeImgUrl;
         // $(this).attr('src', src);
         $(".runResScanImg").attr('src',src);
      $(".resScanForm").slideToggle("slow");
      // $(".viewResScanForm").html("<img src='/imgs/open.png'> Run Reservoir Scan");
      //$(".panel").hide("slow");
    });

  console.log(ncResScan);
    
}
	
  	//Set the UrbanArea 
//  	var cityQuery = new esri.tasks.QueryTask("http://152.19.196.69:6080/arcgis/rest/services/testing/NCRes_MapService/MapServer/9");
//  	var cityParams = new esri.tasks.Query();
//
//  	// ...set parameters
//  	cityParams.geometry = evt.mapPoint;
//  	console.log("You have clicked the Map at :");
//  	console.log(evt.mapPoint);
//  	cityQuery.execute(cityParams, function (cityResults) {
//  	     // function runs when browser receives query results from city layer.
//  	     var countyQuery = esri.tasks.QueryTask("http://152.19.196.69:6080/arcgis/rest/services/testing/NCRes_MapService/MapServer/5");
//  	     var countyParams = new esri.tasks.Query();
//
//  	     // ... set country query parameters
//  	     countyParams.geometry = evt.mapPoint; // from the previous click
//
//  	     countyQuery.execute(countyParams, function (countyResults) {
//  	    	 // this function runs when browser receives query results from country layer
//  	    	 var allAttributes = {};
//  	    	 console.log("cityResults");
//  	    	 console.log(cityResults.features.length);
//  	    	 if (cityResults.features.length > 0) {
//  	    		 console.log(cityResults.features);
//  	    		 // add city results if there are any
//  	    	 }
//
//  	    	 console.log("countyResults");
//  	    	 console.log(countyResults.features.length);
//	       
//  	    	 if (countyResults.features.length > 0) {
//  	    		 console.log(countyResults.features);
//  	    		 // add country results if there are any
//  	    	 }
//  	       // show results here
//  	       loc['county']=countyResults.features[0].attributes.NAME;
//  	       loc['city']=cityResults.features[0].attributes.NAME;
//  	       console.log(loc);
//  	     });
//  	   });


function computeReservoir() {
	console.log("Computing reservoir...");
	console.log(arguments.callee.name);
  
  loc.damHt = parseFloat($("#damHt").val());
  if ($("#runImpact").prop('checked')){
    loc.runImpact=true;
  }
  if ($("#runStage").prop('checked')){
    loc.runStage=true;
  }
	
  var params = {"Input_DEM":loc.hucDEM, "Latitude":loc.lat, "Longitude":loc.lng,"Dam_height":loc.damHt, "Stage_":loc.runStage, "sessionId":ncResScan.session};
	console.log("Params for ncresscanGP : ");
  console.log(params);
  console.log(ncResScan);
  console.log("Location Object : ");
  console.log(loc);  
  loc['reservoirInParams']= params;


  // alert("Not submitting gp");
  ncresscanGP.submitJob(params,drawReservoir,statusCallback,onError);
  
  //If runImpact === true then submitJob when this job is complete
  
  
  }

  function getImpact(jobInfo, messages){
	  console.log(arguments.callee.name);
	  console.log("ncresImpactGP results for jobId : " + jobInfo.jobId);
	  ncresImpactGPgetResultData(jobInfo.jobId,"Statistics",function(dataList){
		  var rows = dataList.value.length;
		  for (var i=0; i < rows; i++) {
			  // var row = outtable.insertRow(1);
		      // var cell1 = row.insertCell(-1);
		      // cell1.innerHTML = hz;
		      // hz = hz -10;
		      // cell.innerHTML = datalist.value[i];
			  console.log(dataList.value[i]);
//			  dojo.byId("resScanReport").innerHTML +='<br /><h3>VOL : ' + dataList.value[i] + '</h3>';
		      }
	  });
  }


  function drawReservoir(jobInfo, messages) {
	  console.log(arguments.callee.name);
    //loc.jobId=jobInfo.jobId;
	  console.log("ncresscanGP results for jobId : " + loc.jobId);
    console.log(loc);
    loc['stageAreas']=[];
    loc['stageVols']=[];
    // var ncResScanAreaGP, ncResScanVolGP, promises;
    
    // ncResScanAreaGP = ncresscanGP.getResultData(jobInfo.jobId,"areas");
    // ncResScanVolGP  = ncresscanGP.getResultData(jobInfo.jobId,"volume");

    // console.log("deferreds: ", ncResScanAreaGP, ncResScanVolGP);
    // promises = new all([ncResScanAreaGP, ncResScanVolGP]);
    // promises.then(displayTable);
    // console.log("created d list");

	  // ncresscanGP.getResultData(jobInfo.jobId,"areas",displayArea);

    // var operation = gp.execute({ "inputPoly": featureSet });
    // operation.addCallbacks(gpResultAvailable, gpFailure);
  
    ncresscanGP.getResultData(jobInfo.jobId,"areas",function(dataList){
        var rows = dataList.value.length;
        // if (rows > 1){
        //   //alert(rows);
        //   //alert(loc.runStage);
        //   loc.stageAreas.push(dataList);
        // }
        var areaTbl="";
        for (var i=0; i < rows; i++) {
          var areaVal=dataList.value[i];
          if (areaVal !== undefined){
            console.log("Area = ");
            console.log(areaVal);
            // loc.stageAreas.push(dataList.value[i]);
            // ncResScan["jobs_returnVal"].area=dataList.value[i];
            loc["area"]=areaVal;
            loc.stageAreas.push(areaVal);
            // $('#jobArea').text(loc.area);
            // $('#jobArea').text(dataList.value[i]);
            if (i === 0){
               areaTbl += "<p>"+areaVal+"</p>";
            } else {
                areaTbl += "<p>"+i + "  " +areaVal+"</p>";  
            }
            

          }
        }
         $('#jobArea').html(areaTbl);
    });
    ncresscanGP.getResultData(jobInfo.jobId,"volume",function(dataList){
        var rows = dataList.value.length;
        // if (rows > 1){
        //   //alert(rows);
        //   //alert(loc.runStage);
        //   loc.stageVol.push(dataList);
        // }
        var volTbl="";
        for (var i=0; i < rows; i++) {
          var volVal=dataList.value[i];
          if (volVal !== undefined){
            console.log("Volume = ");
            console.log(volVal);
            // loc.stageVol.push(dataList.value[i]);
            // ncResScan["jobs_returnVal"].area=dataList.value[i];
            loc["volume"]=volVal;
            loc.stageVols.push(volVal);
            // $('#jobVolume').text(loc.volume);
            volTbl += "<p>"+volVal+"</p>";
          }
        }
        $('#jobVolume').html(volTbl);
    });
    
	  // ncresscanGP.getResultData(jobInfo.jobId,"volume",displayVol);
	  // ncresscanGP.getResultData(jobInfo.jobId,"Out_DEM",displayFloodZone);
    // ncresscanGP.getResultImageLayer(jobInfo.jobId,"Out_DEM", displayFloodZone);
    var imageParams = new esri.layers.ImageServiceParameters();


    ncresscanGP.getResultImageLayer(jobInfo.jobId, "Out_DEM",imageParams, function(gpLayer){
                                            gpLayer.setOpacity(0.9);
                                            map.addLayer(gpLayer);
    });
	

     ncResScan.jobs.push(loc);
     // alert(ncResScan.jobs);
      // $("#running").hide();
     //alert(ncResScan.jobs.length);
     for (var i=0;i<ncResScan.jobs.length;i++){
          var job=ncResScan.jobs[i];
          var jobReport = "<table class='jobReport'>";
          // jobReport += "<caption><img src='"+ closeImgUrl + "'>" + job.jobId + "</caption>";
          jobReport += "<tr><th colspan='2'>Reservoir Location: </th><th>" + job.location + "</th></tr>";
          jobReport += "<tr><th>Dam Level</th><th>Area</th><th>Volume</th></tr>";
          jobReport += "<tr><td valign='top'>" + job.damHt + "</td><td id='jobArea'></td><td id='jobVolume'></td></tr>";
          // jobReport += "<tr><td colspan='2'>Run Stage : " + job.runStage + "</td></tr>";
          // jobReport += "<tr><td colspan='2'>Run Impact : " + job.runImpact + "</td></tr>";
            // <!-- if runStage === true -->
          if (job.runStage){
              jobReport += "  <tr><th><img class='viewStageReport' src='"+ closeImgUrl+"'>Stage Report</th></tr>";
              for (var stgIdx=0;stgIdx<job.stageVols.length;stgIdx++){
                  jobReport += "  <tr><td>"+stgIdx+"</td><td>"+job.stageAreas[stgIdx]+"</td><td>"+job.stageVols[stgIdx]+"</td></tr>";
              }
              // jobReport += "<tr><td colspan='3'>";
              // jobReport = "       <table id='stageReport'>";
              // jobReport += "      <tr><th>Dam Level</th><th>Area</th><th>Volume</th></tr>";
              // <!-- loop through Stage Levels -->
              // for (var stgIdx=0;stgIdx<job.stageVols.length;stgIdx++){
              //     jobReport += "  <tr><td>"+stgIdx+"</td><td>"+job.stageAreas[stgIdx]+"</td><td>"+job.stageVols[stgIdx]+"</td></tr>";
              // }
              // jobReport += "</td></tr></table>";
              // jobReport += "  <tr><td>115</td><td id='jobArea'></td><td id='jobVolume'></td></tr>";
              // jobReport += "  <tr><td>110</td><td id='jobArea'></td><td id='jobVolume'></td></tr>";
              // jobReport += "  <tr><td>105</td><td id='jobArea'></td><td id='jobVolume'></td></tr>";
              // jobReport += "  <tr><td>100</td><td id='jobArea'></td><td id='jobVolume'></td></tr>";
              // jobReport += "</div>    ";
          }
          
          jobReport += "  <tr><td colspan='2'>Reservoir Raster Layer URL:</td><td><a href='"+ ncResScan.config.reservoirMPServiceURL+"/" + job.jobId + "'>LINK</td></tr>";
      
      // if (!loc.runImpact){
      //   jobReport += "  <tr><td><img class='viewImpatcImg' src='/imgs/close.png'>Impact Report: </td><td colspan='2'>" + job['impactOutFeatures'].jobId + "</td></tr>";
      //   jobReport += "  <tr><td>Impact Layer</td><td>Value</td><td>Unit</td></tr>";
      //     // <!-- LOOP THROUGH IMPACT LAYERS -->
      //   jobReport += "   <tr><td>" + impactLyr.layername + "</td><td>" + impactLyr.stat_value + "</td><td>" + impactLyr.stat_name + "</td></tr> ";
      // }
          if (job.runImpact) {
              jobReport += "  <tr><td colspan='3'></td></tr>";
              // ncresImpactGP.submitJob(impactGPParams,getImpact,statusCallback,onError);
              var tmp_ncresImpactGP_resultData= {
                  "jobId" : "akjf;oiwaksdfklajslkd896",
                  "type" : "impactOutFeatures",
                  "layers": [
                             {
                             "layername": "Cultural Sites",
                             "stat_name": "area",
                             "stat_value": 5280
                             },
                             {
                             "layername": "Roads",
                             "stat_name": "length",
                             "stat_value": 5380
                             },
                             {
                             "layername": "Parks",
                             "stat_name": "area",
                             "stat_value": 25
                             }
                            ]
                    };
              job['impactOutFeatures'] = tmp_ncresImpactGP_resultData;
              jobReport += "<tr><th><img class='viewImpatcImg' src='"+closeImgUrl+"'>Impact Report</th></tr>";
              jobReport += "<tr><th>Impact Layer</th><th>Value</th><th>Unit</th></tr>";
              job['ImpactFeatureCount']=job['impactOutFeatures'].layers.length;

              for (var layIdx=0; layIdx < job.ImpactFeatureCount; layIdx++) {
                  var impactLyr = job['impactOutFeatures'].layers[layIdx];
                    // jobReport += "<tr><td>" + job['impactOutFeatures'].layers[idx].layername + "</td><td>" + job['impactOutFeatures'].layers[idx].stat_value + "</td><td>" + job['impactOutFeatures'].layers[idx].stat_name + "</td></tr>";
                    // jobReport += "<tr><td>" + job.damHt + "</td><td id='jobArea'></td><td id='jobVolume'></td></tr>";
                  jobReport += "<tr><td>" + impactLyr.layername + "</td><td>" + impactLyr.stat_value + "</td><td>" + impactLyr.stat_name + "</td></tr>"; 
                }
              }//end of runImpact
        jobReport += "</table> ";
      }//end for loop jobs
      
      // //IF DEBUG RUN FAKE REPORT
      // $("#job").load('/html/resscanReport_template.html');
      $("#job").append(jobReport);
  }
 
function statusCallback(jobInfo) {
	  console.log(arguments.callee.name);
	  loc['jobId']=jobInfo.jobId; //capture the jobId   ##loc -- should be an array of session 1 session = *jobId, -> *.lat.lng.damHt
	  console.log("Running GPService ["+ loc.jobId + "]");
    var status = jobInfo.jobStatus;
    console.log(status);
    if(status === "esriJobFailed"){
        console.log("### GP Job FAIL ###");
        console.log("#### FAIL JOB ID : " + jobInfo.jobId);
        console.log("#### FAIL JOB -- NCResScan");
        console.log(ncResScan);
        console.log(loc);
        console.log("#### FAIL JOB -- NCResScan");
        $("#running").hide();
        map.infoWindow.hide(); 

    } else if (status === "esriJobSucceeded"){
        // esri.hide(loading);
        //    	 process.innerHTML="<h3>NC ResScan Complete</h3>";

        //PSEUDEO
        //if job suceeds then need to add (push) job onto session
        // need to get return object from jobInfo
    	  // ncResScan.jobs.push(loc);
    	  // $("#runWin").hide();
        // showReport(jobInfo.jobId);
        // $("#floatReport").show();
        console.log("ncReservoir GPService running ... JobID(" + jobInfo.jobId + ")");
        console.log("ncReservoir GPService completed.");
        console.log("ncResScan object = ");
        console.log(ncResScan);
        $(".viewResScanForm").html("<img class='runResScanImg' src='"+ openImgUrl + "'>Run Reservoir Scan");
        $("#running").hide();
        map.infoWindow.hide(); 
        $(".viewResScanForm").html("<img class='runResScanImg' src='"+ openImgUrl + "'>Run Reservoir Scan");
        $("#running").hide();

    } else {  //JOB IS RUNNING
       $("#running").show();
       $(".viewResScanForm").html("<img src='/NCResScan/imgs/spinner.gif' width='20px' height='20px'> Running...");
        var loadingContent = "<p class='running'>Running NC Res Scan (" + loc.jobId + ") at Location " + loc.lat.toFixed(4)  + " / " +  loc.lng.toFixed(4)  + "</p>";
        $("#running").html(loadingContent);
      }
  }

   function onError(error){
	   console.log(arguments.callee.name);
     console.log(error);
     $(".viewResScanForm").html("<img class='runResScanImg' src='"+ openImgUrl + "'>Run Reservoir Scan");
	   $("#running").html("ERROR: " + error);
   }
  
 $(document).ready(function () {
	
	dojo.ready(init);
	
    $('#mapDiv').dblclick(function () {
        jQuery.support.cors = true;
        // alert("You just double-clicked the map.");
    });

    // $('#mapDiv').click(function(){
    //   alert("whatup map");
    // });
    
    console.log(Date());
	console.log("Goodbye from NCResScan.js");

});

//Called when gpGetResultsData finishes
function displayTable(results){
  console.log("displayTable.....");
  console.log(results);

  //State of NCresScan obj after processing
  console.log("State of NCresScan obj after processing:");
  console.log(ncResScan);
  console.log("Number of Jobs = " + ncResScan.jobs.length);
  // Loop through results & display the volume & areas.
   for (var i=0;i<ncResScan.jobs.length;i++){
        // console.log(i);
        console.log(ncResScan.jobs[i].jobId);
        var job=ncResScan.jobs[i];
        for (var stgIdx=0;stgIdx<job.stageVols.length;stgIdx++){
            $('#testStuff').append("!!!!"+stgIdx+"  "+job.stageAreas[stgIdx]+"  "+job.stageVols[stgIdx]+"!!!!");
            // jobReport += "  <tr><td>"+stgIdx+"</td><td>"+job.stageAreas[stgIdx]+"</td><td>"+job.stageVols[stgIdx]+"</td></tr>";
        }
   }
          
  console.log(map);
  map.setZoom(11);
  // alert("GP Job is complete");
  // alert(loc.stageAreas.length);
  // alert(loc.stageAreas.length);

  // for (var i=0;i<ncResScan.jobs.length;i++){
  //   var job=ncResScan.jobs[i];
  //   // alert(ncResScan.jobs[i].jobId);
  //   // var job=ncResScan.jobs[i];
  //   var jobReport = "<table class='jobReport'>";
  //   // jobReport += "<caption><img src='"+ closeImgUrl + "'>" + job.jobId + "</caption>";
  //   jobReport += "<tr><th>Job ID: </th><th colspan='2'>" + job.jobId + "</th></tr>";
  //   jobReport += "<tr><th>Dam Level</th><th>Area</th><th>Volume</th></tr>";
  //   jobReport += "<tr><td>" + job.damHt + "</td><td id='jobArea'></td><td id='jobVolume'></td></tr>";
  //     // <!-- if runStage === true -->
  //   if (job.runStage){
  //       jobReport += "  <tr><th><img class='viewStageReport' src='"+ closeImgUrl+"'>Stage Report</th></tr>";
  //       jobReport += "<tr><td colspan='3'>";
  //       jobReport = "       <table id='stageReport'>";
  //       jobReport += "      <tr><th>Dam Level</th><th>Area</th><th>Volume</th></tr>";

  //       for (var j=0; j<job.stageAreas.length;j++){
  //           // $('#stageReport').append('<tr><td>'+j+' my data</td><td>more data</td></tr>');
  //             $('#stageReport tr:last').after('<tr><td>'+job.stageAreas[j]+' my data</td><td>more data</td></tr>');
  //       }

  //       jobReport += "</td></tr></table>";
  //             // jobReport += "  <tr><td>115</td><td id='jobArea'></td><td id='jobVolume'></td></tr>";
  //             // jobReport += "  <tr><td>110</td><td id='jobArea'></td><td id='jobVolume'></td></tr>";
  //             // jobReport += "  <tr><td>105</td><td id='jobArea'></td><td id='jobVolume'></td></tr>";
  //             // jobReport += "  <tr><td>100</td><td id='jobArea'></td><td id='jobVolume'></td></tr>";
  //             // jobReport += "</div>    ";
  //       }//end of runStage
        
  //       jobReport += "  <tr><td colspan='2'>Reservoir Raster Layer URL:</td><td><a href='"+ ncResScan.config.reservoirMPServiceURL+"/" + job.jobId + "'>LINK</td></tr>";
  //       jobReport += "</table> ";
  //     }//end for loop jobs
      
  //     // //IF DEBUG RUN FAKE REPORT
  //     // $("#job").load('/html/resscanReport_template.html');
  //     $("#job").append(jobReport);  
  
}