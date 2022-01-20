const root = document.getElementById('root');
let selectedPreset = undefined;
let anyline;
let mirrored = true;

// Create a client instance
var client = new Paho.MQTT.Client("broker.emqx.io", Number(8083), "clientId1");

// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

// connect the client
client.connect({onSuccess:onConnect});


// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}

// called when a message arrives
function onMessageArrived(message) {
  console.log("onMessageArrived:"+message.payloadString);
}



async function mountAnylineJS(preset) {
  try {
    selectedPreset = preset;
    var width = window.innerWidth;
    var height = window.innerHeight;
    anyline = window.anylinejs.init({
      config: {},
      viewConfig: {
            outerAlpha: 0.2,
            cutouts: [{
                cutoutConfig:{
                    width: width,
                    height: height,
                    ratioFromSize: {
                        width: width,
                        height: height,
                    },
                    maxWidthPercent: "100%",
                    maxHeightPercent: "100%"  
                } 
            }],
      },
      preset: preset.value,
      license: demoLicense,
      element: root,
      returnFullImage: true,
      debugAnyline: false,
      anylinePath: '../anylinejs',
    });

    anyline.onResult = (result) => {
      console.log('Result: ', result);
      var mrzResult = {};
      for (var i=0;i<result.result.length;i++) {
          r = result.result[i];
          if (r.identifier == "mrzString"){
              mrzResult["mrz"] = r.text;
          }
      }
      
      mrzResult["scanTime"] = result.scanTime;
      message = new Paho.MQTT.Message(JSON.stringify(mrzResult));
      message.destinationName = "DataCapture";
      client.send(message);
      
    };

    await appendCameraSwitcher(anyline);

    await anyline.startScanning().catch((e) => alert(e.message));
  } catch (e) {
    alert(e.message);
    console.error(e);
  }
}

function mirrorCamera() {
  if (!anyline) return;
  const newState = !mirrored;
  anyline.camera.mirrorStream(newState);
  mirrored = newState;
}

function reappendCamera() {
  if (!anyline) return;
  anyline.camera.reappend();
}

async function appendCameraSwitcher(anyline) {
  if (document.getElementById('cameraSwitcher')) return;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {},
    audio: false,
  });

  stream.getTracks().forEach((track) => {
    stream.removeTrack(track);
    track.stop();
  });

  const devices = (await navigator.mediaDevices.enumerateDevices()) || [];
  renderSelect({
    options: devices
      .filter((m) => m.kind === 'videoinput')
      .map((camera) => ({
        text: camera.label,
        value: camera.deviceId,
      }))
      .reduce((acc, camera) => [...acc, camera], [{ text: 'switch cam' }]),
    onSelect: (deviceId) => deviceId && anyline.camera.setCamera(deviceId),
  });
}

function renderSelect({ options, onSelect }) {
  var parent = document.getElementsByClassName('toolbar')[0];

  //Create and append select list
  const selectEl = document.createElement('select');
  selectEl.id = 'cameraSwitcher';
  parent.appendChild(selectEl);

  options.forEach((option) => {
    const optionEl = document.createElement('option');
    optionEl.value = option.value;
    optionEl.text = option.text;
    selectEl.appendChild(optionEl);
  });

  selectEl.onchange = (e) => onSelect(e.target.value);
}

function remountAnylineJS() {
  anyline.stopScanning();
  anyline.dispose();
  mountAnylineJS(selectedPreset);
}

async function enableFlash() {
  if (!anyline) return;
  try {
    await anyline.camera.activateFlash(true);
  } catch (e) {
    alert(e.message);
  }
}

async function disableFlash() {
  if (!anyline) return;
  try {
    await anyline.camera.activateFlash(false);
  } catch (e) {
    alert(e.message);
  }
}

async function refocus() {
  if (!anyline) return;
  try {
    await anyline.camera.refocus();
  } catch (e) {
    alert(e.message);
  }
}
