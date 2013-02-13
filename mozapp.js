var installURL = window.location.protocol + '//' + window.location.host + '/tracks.webapp';
    // assumes app manifest is at host root
var installLink = $('<p>You can <a href="">install this app to your desktop</a>.</p>');

installLink.click(function(e) {
    e.preventDefault();
    navigator.mozApps.install(installURL);
});

try {
    var request = navigator.mozApps.getSelf();
    request.onsuccess = function() {
        if(request.result === null) {
            $('footer').append(installLink);
        }
    };
    request.onerror = function() {
        console.log('Error checking installation status: ' + this.error.message);
    };
} catch(unsupportedError) {
    console.log("This browser doesn't support Mozilla Apps. But that's okay.");
}
