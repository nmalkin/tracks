"use strict";

/* CONSTANTS */
var PADDING_V = 25,
    PADDING_H = 0;
// Use tiles from MapQuest; see: http://developer.mapquest.com/web/products/open/map
var TILE_LAYER = new L.TileLayer("http://{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg", {
    attribution: 'Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors — Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a>',
    subdomains: ['otile1', 'otile2', 'otile3', 'otile4']
});

/* GLOBALS */
var _map, _metadata, _coordinates, _points;


/** Resize map div to use as much of window as possible. */
function resizeMap() {
    $('#map')
        .css('width', window.innerWidth - PADDING_H + 'px')
        .css('height', window.innerHeight - PADDING_V + 'px');
}

/** Initialize map */
function initMap() {
    resizeMap();
    _map = L.map('map');
    _map.addLayer(TILE_LAYER);

    // Resize map when window is resized
    $(window).resize(resizeMap);
}


/**
 * Given an XML document, parse it to get data necessary for display.
 * Returns true on success, false on failure.
 */
function parseGPX(xmlDocument) {
    var xml = $(xmlDocument);

    // get metadata
    var metadata = xml.find('metadata');
    if(metadata.length == 0) {
        console.log('Metadata not found.');
    } else {
        _metadata = {
            name: metadata.children('name').text(),
            desc: metadata.children('desc').text()
        };

        if(_metadata.name == '') {
            _metadata.name = 'No Name';
        }
    }

    // process points
    var trackPoints = xml.find('trkseg').children('trkpt');
    if(trackPoints.length == 0) {
        alert('No points. Malformed GPX?');
        return false;
    }

    _coordinates = [];
    _points = [];
    trackPoints.each(function(i, el) {
        var point = $(el);

        var lat = parseFloat(point.attr('lat')),
            lon = parseFloat(point.attr('lon'));
    
        _coordinates.push(new L.LatLng(lat, lon));
        _points.push({
            lat: lat,
            lon: lon,
            elevation: parseFloat(point.children('ele').text()),
            time: new Date(point.children('time').text())
        });
    });

    return true;
}

/** Returns the cumulative distance (in meters) from starting point to given point. */
function cumulativeDistance(index) {
    var dist = 0;
    for(var i = 0; i < index; i++) {
        dist += _coordinates[i].distanceTo(_coordinates[i+1]);
    }
    return dist;
}

/** Returns HTML string describing point for display. */
function pointDescription(index) {
    var point = _points[index];

    var elapsedTime = Math.round((point.time - _points[0].time)/60000);
    var timeFraction = (point.time - _points[0].time) / (_points[_points.length-1].time - _points[0].time);
    var distFraction = cumulativeDistance(index) / cumulativeDistance(_points.length-1);

    var description =
                   'Time: ' + '<span title="' + point.time.toISOString() + '">' + elapsedTime + ' min</span>' +
                   ' (' + Math.round(timeFraction*100) + '%)' +
        '<br />' + 'Elevation: ' + point.elevation + ' m' +
        '<br />' + 'Distance: ' + Math.round(cumulativeDistance(index)) + ' m' +
                   ' (' + Math.round(distFraction*100) + '%)';
    return description;
}

/** Given Leaflet point, returns the index of the closest point to it in _coordinates. */
function findClosestPoint(target) {
    var minDistance = Infinity,
        minIndex = -1;
    _coordinates.forEach(function(point, i) {
        var dist = target.distanceTo(point);
        if(dist < minDistance) {
            minDistance = dist;
            minIndex = i;
        }
    });

    return minIndex;
}

/** Given Leaflet point, opens a descriptive popup at the closest point to it in _coordinates. */
function pointMarker(target) {
    var closestIndex = findClosestPoint(target);
    var description = pointDescription(closestIndex);
    L.popup()
        .setLatLng(_coordinates[closestIndex])
        .setContent(description)
        .openOn(_map);
}

/** Loads metadata to display locations. */
function displayMetadata() {
    $('#name').text(_metadata.name);
    $('#name').attr('title', _metadata.desc);
}

/** Draws a path on the map using the points in _coordinates. */
function drawPath() {
    var path = L.polyline(_coordinates).addTo(_map);
    _map.fitBounds(path.getBounds());
    path.on('click', function(e) {
        pointMarker(e.latlng);
    });
    L.control.scale().addTo(_map);
}

/** Given an array of DOM Files, reads them, parses the XML, and displays map. */
function loadFiles(files) {
    var reader = new FileReader();
    reader.onloadend = function(e) {
        var data = this.result;
        var xml;
        try {
            xml = $.parseXML(data);
        } catch(e) {
            console.log(e);
            alert('Invalid XML. You should check if this is actually a GPX file.');
            return;
        }
        var success = parseGPX(xml);
        if(success) {
            $('#drop').remove();
            $('footer').remove();
            displayMetadata();
            initMap();
            drawPath();
        }
    }

    reader.readAsText(files[0]);
}

/* Listens for files dragged to the drop div. */
$('#drop').bind({
    dragover: function () {
        $(this).addClass('hover');
        return false;
    },
    dragleave: function () {
        $(this).removeClass('hover');
        return false;
    },
    dragend: function () {
        $(this).removeClass('hover');
        return false;
    },
    drop: function (e) {
        $(this).removeClass('hover');
        e.preventDefault();

        e = e.originalEvent;
        var files = e.dataTransfer.files;
        loadFiles(files);

        return false;
    }
});

/* Initiate loading when file input is used. */
$('#load').change(function(e) {
    loadFiles(this.files);
});

/* Use drop areas as file-input-trigger button. */
$('#drop').click(function() {
    $('#load').trigger('click');
});

/* Header link reloads page, but only after confirmation. */
$('header > h1').click(function(e) {
    if(_points !== undefined) {
        return confirm('Reloading the page will clear the currently loaded file.' +
            '\nAre you sure you want to continue?');
    } else {
        return true;
    }
});

/* Ascertain initialization status (prevents error message). */
_init = true;
