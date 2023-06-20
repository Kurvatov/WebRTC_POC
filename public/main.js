// Get the room ID from the URL query parameters
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");

// Connect to the Socket.IO server
const socket = io();
let isCameraEnabled = true;
let isAudioEnabled = true;
// Join the room with the specified room ID
socket.emit("join-room", roomId);

// Get the local video stream
navigator.mediaDevices
  .getUserMedia({ video: true, audio: true })
  .then((stream) => {
    const localVideo = document.getElementById("localVideo");
    localVideo.srcObject = stream;

    // Create a new WebRTC peer connection
    const peerConnection = new RTCPeerConnection();

    // Add the local stream to the peer connection
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    // Listen for ICE candidates and send them to the other peer
    peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    });

    // Listen for remote tracks and add them to the remote video element
    peerConnection.addEventListener("track", (event) => {
      const remoteVideo = document.getElementById("remoteVideo");
      if (!remoteVideo.srcObject) {
        remoteVideo.srcObject = new MediaStream();
      }
      remoteVideo.srcObject.addTrack(event.track);
    });

    // Send the offer to the other peer
    peerConnection
      .createOffer()
      .then((offer) => {
        socket.emit("offer", offer);
        return peerConnection.setLocalDescription(offer);
      })
      .catch((error) => {
        console.error("Error creating offer:", error);
      });

    // Handle the received offer
    socket.on("offer", (offer) => {
      peerConnection
        .setRemoteDescription(offer)
        .then(() => {
          return peerConnection.createAnswer();
        })
        .then((answer) => {
          socket.emit("answer", answer);
          return peerConnection.setLocalDescription(answer);
        })
        .catch((error) => {
          console.error("Error creating answer:", error);
        });
    });

    // Handle the received answer
    socket.on("answer", (answer) => {
      peerConnection.setRemoteDescription(answer).catch((error) => {
        console.error("Error setting remote description:", error);
      });
    });

    // Handle the received ICE candidate
    socket.on("ice-candidate", (candidate) => {
      peerConnection.addIceCandidate(candidate).catch((error) => {
        console.error("Error adding ICE candidate:", error);
      });
    });

    // Disable or enable the camera
    const disableCameraButton = document.getElementById(
      "disableCameraButton"
    );
    disableCameraButton.addEventListener("click", () => {
      if (isCameraEnabled) {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
        disableCameraButton.querySelector('img').src = './disable-camera.svg';
      } else {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
        disableCameraButton.querySelector('img').src = './enable-camera.svg';
      }
      isCameraEnabled = !isCameraEnabled;
    });
    // Mute/unmute the audio
    const muteButton = document.getElementById("muteButton");
    muteButton.addEventListener("click", () => {
      if (isAudioEnabled) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        // muteButton.textContent = "Unmute";
        muteButton.querySelector('img').src = './mute.svg';
      } else {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        // muteButton.textContent = "Mute";
        muteButton.querySelector('img').src = './unmute.svg';
      }
      isAudioEnabled = !isAudioEnabled;
    });
  })
  .catch((error) => {
    console.error("Error accessing media devices:", error);
  });

// Handle user-connected event
socket.on("user-connected", (userId) => {});

// Handle user-disconnected event
socket.on("user-disconnected", (userId) => {});
