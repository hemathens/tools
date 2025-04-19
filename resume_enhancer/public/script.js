const socket = io();
const roomID = prompt("Enter room ID to join:");
socket.emit("join-room", roomID);

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
let localStream;
let peerConnection;

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
  ]
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
  });

socket.on("user-joined", async (id) => {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice-candidate", { candidate: e.candidate });
    }
  };

  peerConnection.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { offer });
});

socket.on("offer", async (data) => {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice-candidate", { candidate: e.candidate });
    }
  };

  peerConnection.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", { answer });
});

socket.on("answer", async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on("ice-candidate", async (data) => {
  try {
    await peerConnection.addIceCandidate(data.candidate);
  } catch (e) {
    console.error("Error adding received ice candidate", e);
  }
});