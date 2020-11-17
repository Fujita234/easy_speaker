const Peer = window.Peer;

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  const roomMode = document.getElementById('js-room-mode');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');
  let myPeerId = null;
    
  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer({
    key: '',
    debug: 3,
  }));

  // Register join handler
  joinTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    const room = peer.joinRoom(roomId.value, {
      mode: 'sfu',
      stream: localStream,
    });

    room.once('open', peerId => {
      messages.textContent += '=== You joined ===\n';
      myPeerId = peer.id;
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} joined ===\n`;
    });

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      const newVideo = document.createElement('video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      newVideo.setAttribute('data-peer-id', stream.peerId);
      newVideo.classList.add('otherVideo');
      newVideo.setAttribute('data-is-Call', 'no');
      newVideo.addEventListener('click', () => {
        const isCall = newVideo.dataset.isCall;
        const src = newVideo.dataset.peerId;
        console.log(isCall);
        if (isCall === 'yes') {
          let ok = window.confirm(src + 'さんとの通話を終了しますか？');
          if (ok) {
            const data = {
              finishCall: true,
              finishUser: stream.peerId
            }
            room.send(data);
            newVideo.setAttribute('data-is-Call', 'no');
          }
        } else {
          newVideo.setAttribute('data-is-Call', 'yes');
          const data = {
            user: stream.peerId,
          }
          room.send(data);
        }
      });
      remoteVideos.append(newVideo);
      await newVideo.play().catch(console.error);
    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      let ok = false;
      if (myPeerId == data.user) {
        ok = window.confirm(src + "さんが貴方に用があるようです。");
      }
      if (ok) {
        const sendData = {
          user: data.user,
          answer: 'ok',
          otherUser: src,
        }
        const abc = document.getElementsByClassName('otherVideo');
        for (let i = 0; i < abc.length; i++) {
          if (abc[i].dataset.peerId === src) {
            abc[i].setAttribute('data-is-Call', 'yes');
          }
        }
        messages.textContent += `${src}さんと、${data.user}さんが通話を開始しました。\n`;
        console.log(sendData.user);
        console.log(sendData.otherUser);
        room.send(sendData);
      }
      if (data.answer === 'ok') {
        const abc = document.getElementsByClassName('otherVideo');
        const myPeerId = peer.id;
        if (myPeerId !== data.user && myPeerId !== data.otherUser) {
          for (let i = 0; i < abc.length; i++) {
            console.log(abc[i]);
            abc[i].muted = true;
          }
        }
      }
      if (data.finishCall) {
        const abc = document.getElementsByClassName('otherVideo');
        if (data.finishUser === myPeerId) {
          yes = window.confirm(src + "さんはこの会話を終了しようとしています。終了しますか？");
        }
        if (yes) {
          const finishCallDate = {
            completeFinish: true,
            finishUser1: data.finishUser,
            finishUser2: src,
          }
          room.send(finishCallDate);
        }
      }
      if (data.completeFinish) {
        const abc = document.getElementsByClassName('otherVideo');
        for (let i = 0; i < abc.length; i++) {
          if(abc[i].dataset.peerId === data.finishUser1) {
            abc[i].muted = false;
          }
          if (abc[i].dataset.peerId === data.finishUser2) {
            abc[i].muted = false;
          }
        }
      }
    });

    // for closing room members
    room.on('peerLeave', peerId => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id=${peerId}]`
      );
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();

      messages.textContent += `=== ${peerId} left ===\n`;
    });

    // for closing myself
    room.once('close', () => {
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '== You left ===\n';
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    sendTrigger.addEventListener('click', onClickSend);
    leaveTrigger.addEventListener('click', () => room.close(), { once: true }, console.log("aaa"));

    function onClickSend() {
      // Send message to all of the peers in the room via websocket
      room.send(localText.value);

      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }
  });

  peer.on('error', console.error);
})();