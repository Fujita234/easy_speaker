const Peer = window.Peer;

(async function main() {
  const joinTrigger = document.getElementById('js-join-trigger');  
  const localVideo = document.getElementById('js-local-stream');
  const localText = document.getElementById('js-local-text');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const messages = document.getElementById('js-messages');  
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  const sendTrigger = document.getElementById('js-send-trigger');
  let myPeerId = null;
    
  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

  // localStream作成
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  // API key配置
  const peer = (window.peer = new Peer({
    key: '',
    debug: 3,
  }));

  // join handlerを作成
  joinTrigger.addEventListener('click', () => {
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

    // 入室中の部屋に新しくユーザがきた時にユーザのカメラをセット
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
      // メッセージを通話相手に送信
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

    // ルームメンバーが退出する際の処理
    room.on('peerLeave', peerId => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id=${peerId}]`
      );
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();

      messages.textContent += `=== ${peerId} left ===\n`;
    });

    // 自分自身が退出する際の処理
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
      // 入室した際にメッセージを全員に送る処理
      room.send(localText.value);

      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }
  });

  peer.on('error', console.error);
})();