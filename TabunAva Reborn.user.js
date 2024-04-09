// ==UserScript==
// @name         TabunAva Reborn
// @namespace    http://tampermonkey.net/
// @version      1.4.0
// @description  Установка своего аватара на Табуне!
// @author       (IntelRug && (Kujivunia || Niko_de_Andjelo))
// @match        https://tabun.everypony.ru/*
// @grant        none
// @license MIT
// ==/UserScript==

// Tabun Swarm: https://tabun.everypony.ru/blog/uniblog/194538.html
// IDENTICON: https://avatars.dicebear.com/styles/identicon

const GRemoteSettingsLink = 'https://raw.githubusercontent.com/Kujivunia/TabunAva-Reborn/main/settings.json';
const GEveryponyCdnStorageRegex = /(https?:)?\/\/cdn\.everypony\.ru\/storage\//;
const GEveryponyCdnStorageLink = '//cdn.everypony.ru/storage/';

let GAvaDictionary = {};
let GSettings = {};

function isTabunAvaSettingsPage() {
  return window.location.search.includes('tabun-ava');
}

function addLinkToNavigation() {
  const navPillsNode = document.querySelector('.nav-pills');
  if (!navPillsNode) return;

  const navItemNode = document.createElement('li');
  const navAnchorNode = document.createElement('a');
  navAnchorNode.setAttribute('href', '/settings/account?tabun-ava');
  navAnchorNode.innerHTML = 'TabunAva';
  navItemNode.appendChild(navAnchorNode);
  navPillsNode.appendChild(navItemNode);

  if (isTabunAvaSettingsPage()) {
    const activeNavItemNode = document.querySelector('.nav-pills li.active');
    if (activeNavItemNode) activeNavItemNode.classList.remove('active');
    navItemNode.classList.add('active');
  }
}

function getDefaultSettings() {
  return {
    faceless: 'default',
    faceless_picture: '',
    faceless_picture_f: '',
    blacklist: '',
    header_text: '',
    refresh_period: 10,
    refresh_unit: 'minutes',
    animated: true,
    priority: true,
  };
}

function updateSettingsForm(settings = {}) {
  const mergedSettings = Object.assign({}, settings);

  Object.keys(mergedSettings).forEach((key) => {
    const node = document.getElementById(key);
    if (node) {
      if (node.type === 'checkbox') {
        node.checked = mergedSettings[key];
      } else {
        node.value = mergedSettings[key];
      }
    }
  });
}

/**
 *  Достает локальные настройки из localStorage и объединяет их с внешними настройками с гитхаба
 *  Если пришло время обновлять базу, получает внешние настройки с гитхаба, иначе загружает их
 *  сохранённую копию из localStorage
 */
function getSettings() {
  // Достаём локальные настройки из localStorage
  let settings = {};
  const jsonString = localStorage.getItem('TabunAvaReborn_Settings');
  if (jsonString) {
    try {
      settings = JSON.parse(jsonString);
    } catch (e) {
      settings = {};
    }
  }

  // Объединяем с настройками по-умолчанию, на случай, если в localStorage отсутствуют настройки
  settings = Object.assign({}, getDefaultSettings(), settings);

  const oldSettings = Object.assign({}, GSettings);
  GSettings = settings;
  const shouldUpdate = shouldUpdateAvatarsStorage();
  GSettings = oldSettings;

  // Получаем внешние настройки и объединяем с ними локальные настройки
  if (shouldUpdate) {
    return getRemoteSettings()
      .then((remoteSettings) => {
        settings.remote = remoteSettings;
        localStorage.setItem('TabunAvaReborn_Settings', JSON.stringify(settings));
        return settings;
      });
  } else {
    if (!settings.remote) {
      settings.remote = getDefaultRemoteSettings();
    }
    return Promise.resolve(settings);
  }
}

function getRefreshMillis() {
  let millis = 1000 * +GSettings.refresh_period; // 1 second

  if (GSettings.refresh_unit === 'minutes') {
    millis *= 60;
  } else if (GSettings.refresh_unit === 'hours') {
    millis *= 60 * 60;
  } else if (GSettings.refresh_unit === 'days') {
    millis *= 60 * 60 * 24;
  }

  return millis;
}

function saveSettings() {
  const settings = {
    remote: GSettings.remote || getDefaultRemoteSettings(),
  };

  Object.keys(getDefaultSettings()).forEach((key) => {
    const node = document.getElementById(key);
    if (node) {
      if (node.type === 'checkbox') {
        settings[key] = node.checked;
      } else {
        settings[key] = node.value;
      }
    }
  });

  localStorage.setItem('TabunAvaReborn_Settings', JSON.stringify(settings));
  alert('Настройки сохранены');
}

function getDefaultRemoteSettings() {
  return {
    post: 'https://tabun.everypony.ru/blog/TabunAva/203681.html',
    blacklist: [],
  };
}

function getRemoteSettings() {
  return fetch(GRemoteSettingsLink)
    .then((response) => {
      if (!response.ok) {
        return getDefaultRemoteSettings();
      }
      return response.json();
    })
    .then((settings) => {
      return Object.assign({}, getDefaultRemoteSettings(), settings);
    })
    .catch(() => {
      return getDefaultRemoteSettings();
    })
}

function replaceSettingsForm(formNode) {
  const securityLsKey = document.querySelector('[name=security_ls_key]');
  const node = formNode || document.querySelector('form.wrapper-content');

  node.innerHTML = getSettingsTemplate();
  if (securityLsKey) {
    node.innerHTML += '<input type="hidden" name="security_ls_key" value="' + securityLsKey.value + '">';
  }

  updateSettingsForm(GSettings);

  const saveButtonNode = document.querySelector('#save_button');
  saveButtonNode.addEventListener('click', (event) => {
    event.preventDefault();
    saveSettings(saveButtonNode);
  });

  const refreshButtonNode = document.querySelector('#refresh_button');
  refreshButtonNode.addEventListener('click', (event) => {
    event.preventDefault();
    refreshAvatarsStorage()
      .then(() => {
        alert('База данных обновлена');
      });
  });
}

function getSettingsButtonTemplate() {
  return '\
    <style>\
      .ta-button {\
        height: 25px;\
        display: inline-block;\
        width: 25px;\
        vertical-align: bottom;\
        background: linear-gradient(0deg, #f4f4f4, #f9fbfb);\
        color: #8a9198;\
        border-radius: 4px;\
        border: 1px solid #e3e6eb;\
        box-sizing: border-box;\
        position: relative;\
        bottom: -3px;\
      }\
      \
      .ta-button > svg {\
        fill: currentColor;\
        width: 18px;\
        height: 18px;\
        margin-top: 3px;\
        margin-left: 3px;\
      }\
      \
      .ta-button:hover {\
        background: linear-gradient(0deg, #23b2fe, #4cc3ff);\
        border-color: #28adea;\
        color: #ffffff;\
      }\
    </style>\
    <a class="ta-button">\
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px">\
        <path d="M0 0h24v24H0V0z" fill="none"></path>\
        <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"></path>\
      </svg>\
    </a>\
  ';
}

function getSettingsTemplate() {
  return '\
    <div class="wrapper-content">\
      <dl class="form-item">\
        <a href="https://tabun.everypony.ru/settings/account?tabun-ava" id="avatar-upload">Загрузить аватар</a>\
      </dl>\
      <dl class="form-item">\
        <label for="faceless" style="margin-bottom: 7px">Как отображать безликих пони:</label>\
        <select name="faceless" id="faceless" class="input-width-200">\
          <option value="default" selected="">Не изменять</option>\
          <option value="identicon">IDENTICON</option>\
          <option value="swarm">Swarm</option>\
          <option value="other">Своя картинка</option>\
        </select>\
      </dl>\
      <dl class="form-item">\
        <label for="faceless_picture" style="margin-bottom: 7px">\
          Своя картинка безликого пони:\
        </label>\
        <input\
          type="text"\
          name="faceless_picture"\
          id="faceless_picture"\
          class="input-text input-width-200"\
          placeholder="https://..."\
        >\
      </dl>\
      <dl class="form-item">\
        <label for="faceless_picture_f" style="margin-bottom: 7px">\
            Своя картинка безликой кобылки (если отличается от предыдущей):\
        </label>\
        <input\
          type="text"\
          name="faceless_picture_f"\
          id="faceless_picture_f"\
          class="input-text input-width-200"\
          placeholder="https://..."\
        >\
      </dl>\
      <dl class="form-item">\
        <label for="header_text" style="margin-bottom: 7px">\
          Заголовок Табуна:\
        </label>\
        <input\
          type="text"\
          name="header_text"\
          id="header_text"\
          class="input-text input-width-200"\
          placeholder="Да, это — Табун!"\
        >\
      </dl>\
      <dl class="form-item">\
        <label for="blacklist" style="margin-bottom: 7px">\
          Чёрный список:\
        </label>\
        <textarea\
          name="blacklist"\
          id="blacklist"\
          class="input-text input-width-200"\
          rows="2"\
          placeholder="Pony, Pony2, Pony3"\
          style="resize: vertical"\
        ></textarea>\
      </dl>\
      <dl class="form-item">\
        <label for="refresh_period" style="margin-bottom: 7px">\
          Частота обновления базы аватарок:\
        </label>\
        <input\
          type="text"\
          name="refresh_period"\
          id="refresh_period"\
          class="input-text"\
          placeholder="30"\
          style="width: 36px; margin-right: 4px;"\
        >\
        <select\
          name="refresh_unit"\
          id="refresh_unit"\
          style="width: 70px; margin-right: 4px;"\
        >\
          <option value="minutes" selected="">минут</option>\
          <option value="hours">часов</option>\
          <option value="days">дней</option>\
        </select>\
        <button\
          type="submit"\
          id="refresh_button"\
          name="refresh_button"\
          class="button button-primary"\
          style="width: 80px; height: 26px; margin-top: -4px;"\
        >\
          Обновить\
        </button>\
      </dl>\
      <dl class="form-item">\
        <label>\
          <input type="checkbox" id="animated" name="animated" value="1" class="input-checkbox">\
          анимированные аватарки\
        </label>\
      </dl>\
      <dl class="form-item">\
        <label>\
          <input type="checkbox" id="priority" name="priority" value="1" class="input-checkbox">\
          приоритет аватарок из темы над аватарками из профиля\
        </label>\
      </dl>\
      <button id="save_button" type="submit" name="submit" class="button button-primary">Сохранить</button>\
    </div>\
    <style>\
      form > .wrapper-content > .form-item #avatar-upload {\
        font-size: 18px;\
        line-height: 1.4;\
        font-weight: 600;\
        color: indianred;\
        padding: 10px 0;\
        display: block;\
      }\
    </style>\
';
}

function initSettingsPage() {
  if (!isTabunAvaSettingsPage()) {
    const widemodeNode = document.querySelector('#widemode');
    const span = document.createElement('span');
    span.innerHTML = getSettingsButtonTemplate().trim();
    widemodeNode.appendChild(span);

    const popup = document.createElement('div');
    popup.classList.add('ta-popup');
    popup.style.display = 'none';
    popup.innerHTML = '\
      <style>\
        .ta-popup {\
          position: fixed;\
          bottom: 50px;\
          right: 0;\
          width: 276px;\
          z-index: 999;\
          background: #ffffff;\
          border-radius: 10px 0 0 10px;\
          padding: 16px;\
          box-sizing: border-box;\
          border: 1px solid #ccc;\
        }\
      </style>\
      <div id="settings-popup-content"></div>\
    ';
    document.body.appendChild(popup);

    widemodeNode.querySelector('.ta-button')
      .addEventListener('click', () => {
      if (popup.style.display === 'none') {
        popup.style.display = 'block';
      } else {
        popup.style.display = 'none';
      }
    });

    const settingsNode = document.querySelector('#settings-popup-content');
    replaceSettingsForm(settingsNode);
  }

  if (window.location.href.includes('/settings')) {
    addLinkToNavigation();

    if (isTabunAvaSettingsPage()) {
      replaceSettingsForm();
    }
  }
}

function getAvatarsDocument() {
  return fetch(GSettings.remote.post)
    .then((response) => {
      return response.text();
    })
    .then((text) => {
      let domParser = new DOMParser();
      return domParser.parseFromString(text, "text/html");
    });
}

function fillAvatarsDictionary(avaDocument) {
  GAvaDictionary = {};
  const commentNodes = avaDocument.querySelectorAll('#comments .comment');

  commentNodes.forEach((commentNode) => {
    const authorNode = commentNode.querySelector('.comment-author');
    const username = authorNode && authorNode.textContent.trim();
    if (!username) return;

    const contentNode = commentNode.querySelector('.comment-content');
    const imageNode = contentNode && contentNode.querySelector('.text > img');

    if (imageNode && imageNode.hasAttribute('src')) {
      GAvaDictionary[username] = imageNode
        .getAttribute('src')
        .replace(GEveryponyCdnStorageRegex, ''); // Сокращаем количество сохраняемых символов
    }
  });
}

// Сохранить список аватаров в локальное хранилище браузера
function saveAvatarsDictionary() {
  const jsonString = JSON.stringify(GAvaDictionary);
  localStorage.setItem('TabunAvaReborn_Avatars', jsonString);
  localStorage.setItem('TabunAvaReborn_LastUpdate', Date.now().toString());
}

function refreshAvatarsStorage() {
  return getRemoteSettings()
    .then((remoteSettings) => {
      GSettings.remote = remoteSettings;
      localStorage.setItem('TabunAvaReborn_Settings', JSON.stringify(GSettings));
      return getAvatarsDocument();
    })
    .then((avaDocument) => {
      fillAvatarsDictionary(avaDocument);
      saveAvatarsDictionary();
    });
}

function shouldUpdateAvatarsStorage() {
  const lastUpdate = +(localStorage.getItem('TabunAvaReborn_LastUpdate') || '0');
  return (Date.now() - lastUpdate) > getRefreshMillis(); // прошло больше 10 минут с последнего обновления
}

// Достать список аватаров из локального хранилища браузера или обновить из поста
function loadAvatarsDictionary() {
  if (shouldUpdateAvatarsStorage()) {
    return refreshAvatarsStorage();
  } else {
    const jsonString = localStorage.getItem('TabunAvaReborn_Avatars');
    if (jsonString) {
      try {
        GAvaDictionary = JSON.parse(jsonString);
        return Promise.resolve();
      } catch (e) {
        return refreshAvatarsStorage();
      }
    }
  }
}

function isDefaultAvatar(link) {
  return /(\/local\/avatar_male_)/.test(link) || /(\/local\/avatar_female)/.test(link);
}

function getIdenticonAvatar(username) {
  return 'https://api.dicebear.com/8.x/identicon/svg?seed=' + username + '&scale=100&size=48';
}

function getNewTabunAvatar(username) {
  if (GAvaDictionary[username]) {
    if (!/^(https?:)?\/\//.test(GAvaDictionary[username])) {
      return GEveryponyCdnStorageLink + GAvaDictionary[username];
    }
    return GAvaDictionary[username];
  }
  return false;
}

function isGIF(src) {
  return src.includes('.gif');
}

function freezeGIF(imageNode) {
  const c = document.createElement('canvas');
  const w = c.width = imageNode.width;
  const h = c.height = imageNode.height;
  c.getContext('2d').drawImage(imageNode, 0, 0, w, h);
  try {
    imageNode.src = c.toDataURL("image/gif"); // if possible, retain all css aspects
  } catch (e) { // cross-domain -- mimic original with all its tag attributes
    for (let j = 0, a; a = imageNode.attributes[j]; j++)
      c.setAttribute(a.name, a.value);
    imageNode.parentNode.replaceChild(c, imageNode);
  }
}

function getBlackList() {
  let blacklist = GSettings.blacklist
    .replace(/ /g, '')
    .split(',');

  if (Array.isArray(GSettings.remote && GSettings.remote.blacklist)) {
    blacklist = blacklist.concat(GSettings.remote.blacklist);
  }

  return blacklist;
}

function replaceAvatarInImageNode(imageNode, username) {
  const ignore = getBlackList();
  const tabunAvatar = getNewTabunAvatar(username);
  if (tabunAvatar && !ignore.includes(username)) {
    if(GSettings.priority || !imageNode.getAttribute('src') || isDefaultAvatar(imageNode.getAttribute('src'))) {
      imageNode.setAttribute('src', tabunAvatar);

      if (!GSettings.animated && isGIF(tabunAvatar)) {
        freezeGIF(imageNode);
      }
    }
  } else if (
    !imageNode.getAttribute('src')
    || isDefaultAvatar(imageNode.getAttribute('src'))
  ) {
    if (GSettings.faceless === 'identicon') {
      imageNode.setAttribute('src', getIdenticonAvatar(username));
    } else if (GSettings.faceless === 'swarm') {
      const domain = '//cdn.everypony.ru/storage/00/28/16/2020/03/19/';
      const src = imageNode.getAttribute('src');

      if (src.includes('female_48x48.png')) {
        imageNode.setAttribute('src', domain + 'be9038d210.jpg');
      } else if (src.includes('male_48x48.png')) {
        imageNode.setAttribute('src', domain + '02dcb0e9c1.jpg');
      } else if (src.includes('female_24x24.png')) {
        imageNode.setAttribute('src', domain + 'f46f457af7.jpg');
      } else if (src.includes('male_24x24.png')) {
        imageNode.setAttribute('src', domain + 'b76b8f4e75.jpg');
      } else if (src.includes('female')) {
        imageNode.setAttribute('src', domain + '4d43849b81.jpg');
      } else if (src.includes('male')) {
        imageNode.setAttribute('src', domain + '4dac2ae27e.jpg');
      }
    } else if (GSettings.faceless === 'other' && GSettings.faceless_picture) {
      if (imageNode.getAttribute('src').includes('female') && GSettings.faceless_picture_f) {
        imageNode.setAttribute('src', GSettings.faceless_picture_f);
      }
      else {
        imageNode.setAttribute('src', GSettings.faceless_picture);
      }
    }
  }
}

// Замена собственного аватара пользователя в шапке страницы
function replaceHeaderAvatar() {
  const imageNode = document.querySelector('#dropdown-user img');
  if (!imageNode) return;

  const usernameNode = document.querySelector("#dropdown-user .username");
  const username = usernameNode && usernameNode.textContent.trim();
  if (!username) return;

  replaceAvatarInImageNode(imageNode, username);
}

// Замена аватара пользователя в профиле
function replaceProfileAvatar() {
  const imageNode = document.querySelector('.profile img.avatar');
  if (!imageNode) return;

  const usernameNode = document.querySelector(".profile [itemprop=nickname]");
  const username = usernameNode && usernameNode.textContent.trim();
  if (!username) return;

  replaceAvatarInImageNode(imageNode, username);
}

// Замена аватара друзей в профиле
function replaceProfileFriendAvatars() {
  const userNodes = document.querySelectorAll('.user-list-avatar > *');
  userNodes.forEach((userNode) => {
    const imageNode = userNode.querySelector('img');
    if (!imageNode) return;

    const username = userNode.textContent.trim();
    if (!username) return;

    imageNode.width = 48;
    imageNode.height = 48;

    replaceAvatarInImageNode(imageNode, username);
  });
}

// Замена аватара автора поста
function replaceTopicAuthorAvatars() {
  const topicNodes = document.querySelectorAll('.topic');
  topicNodes.forEach((topicNode) => {
    const imageNode = topicNode.querySelector('.avatar');
    if (!imageNode) return;

    const usernameNode = topicNode.querySelector("[rel=author]");
    const username = usernameNode && usernameNode.textContent.trim();
    if (!username) return;

    replaceAvatarInImageNode(imageNode, username);
  });
}

// Замена аватаров в комментариях
function replaceCommentAvatars() {
  const commentNodes = document.querySelectorAll('.comment');
  commentNodes.forEach((commentNode) => {
    const authorNode = commentNode.querySelector('.comment-author');
    const username = authorNode && authorNode.textContent.trim();
    if (!username) return;
    const imageNode = commentNode.querySelector('img.comment-avatar');
    if (!imageNode) return;
    replaceAvatarInImageNode(imageNode, username);
  });
}

// Замена аватаров в ленте активности
function replaceStreamAvatars() {
  const streamNodes = document.querySelectorAll('.stream-item');
  streamNodes.forEach((streamNode) => {
    const authorNode = streamNode.querySelector('.info a');
    const username = authorNode && authorNode.textContent.trim();
    if (!username) return;

    const imageNode = streamNode.querySelector('img');
    if (!imageNode) return;

    replaceAvatarInImageNode(imageNode, username);
  });
}

// Замена аватаров в разделе "Брони"
function replacePeopleAvatars() {
  const userNodes = document.querySelectorAll('.table-users .cell-name');
  userNodes.forEach((userNode) => {
    const authorNode = userNode.querySelector('.username');
    const username = authorNode && authorNode.textContent.trim();
    if (!username) return;

    const imageNode = userNode.querySelector('img');
    if (!imageNode) return;

    imageNode.width = 48;
    imageNode.height = 48;

    replaceAvatarInImageNode(imageNode, username);
  });
}

// Замена аватаров в блоке "Пожертвования"
function replaceDonationAvatars() {
  const userNodes = document.querySelectorAll('.donation-list > *');
  userNodes.forEach((userNode) => {
    const username = userNode.textContent.trim();
    if (!username) return;

    const imageNode = userNode.querySelector('img');
    if (!imageNode) return;

    imageNode.width = 24;
    imageNode.height = 24;

    replaceAvatarInImageNode(imageNode, username);
  });
}
// Замена аватаров в блоке "Пожертвования"
function replaceProfileSettingsAvatar() {
  const imageNode = document.querySelector('#avatar-img');
  if (!imageNode) return;

  const usernameNode = document.querySelector("#dropdown-user .username");
  const username = usernameNode && usernameNode.textContent.trim();
  if (!username) return;

  replaceAvatarInImageNode(imageNode, username);
}

function replaceAvatarsOnCommentsRefresh() {
  const countCommentsNode = document.querySelector('#count-comments');
  if (!countCommentsNode) return;

  countCommentsNode.addEventListener('DOMSubtreeModified', () => {
    replaceCommentAvatars();
  });
}

function replaceAvatarsOnRepliesRefresh() {
  const avatarNodes = document.querySelectorAll('.tabun-replies-container img.comment-avatar')
  avatarNodes.forEach((imageNode) => {
    const authorNode = imageNode.parentElement
    if(!authorNode || !authorNode.getAttribute('href')) return;
    const username = authorNode.getAttribute('href').replace('/profile/', '').replace('/', '')
    if (!username) return;
    replaceAvatarInImageNode(imageNode, username);
  })
}

function getFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = reject;
  })
}

function getImageDimensions(url) {
  const img = document.createElement('img');

  const promise = new Promise((resolve, reject) => {
    img.onload = () => {
      // Natural size is the actual image size regardless of rendering.
      // The 'normal' width/height are for the **rendered** size.
      const width  = img.naturalWidth;
      const height = img.naturalHeight;

      // Resolve promise with the width and height
      resolve({ width, height });
    };

    // Reject promise on error
    img.onerror = reject;
  });

  // Setting the source makes it start downloading and eventually call onload
  img.src = url;

  return promise;
}

function initAvatarUpload() {
  const avatarUploadNode = document.querySelector('#avatar-upload');
  const avatarRemoveNode = document.querySelector('#avatar-remove');
  const securityLsKey = document.querySelector('[name=security_ls_key]');
  if (!securityLsKey || !avatarUploadNode) return;

  if (avatarRemoveNode) {
    avatarRemoveNode.style.display = 'none';
  }

  const input = document.createElement('input')
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/gif';

  input.addEventListener('change', () => {
    if (!input.files[0]) return;

    getFileBase64(input.files[0])
      .then((base64) => {
        return getImageDimensions(base64)
      })
      .then((dimensions) => {
        if (dimensions.width > 100 || dimensions.height > 100) {
          throw new Error('Максимальный размер картинки - 100x100 пикселей');
        }

        const uploadBody = new FormData();
        uploadBody.append('img_file', input.files[0]);
        uploadBody.append('security_ls_key', securityLsKey.value);

        return fetch('https://tabun.everypony.ru/ajax/upload/image/', {
          method: 'POST',
          body: uploadBody,
        });
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Не удалось загрузить автар, обратитесь к создателю скрипта. Код ошибки: UPLOAD_IMAGE_ERR');
        }

        return response.text();
      })
      .then((text) => {
        if (!text) {
          throw new Error('Не удалось загрузить автар, обратитесь к создателю скрипта. Код ошибки: UPLOAD_IMAGE_EMPTY');
        }

        text = text.replace(/&quot;/g, '"')
          .replace(/\\\//g, '/');

        const match = text.match(/src=\\"([^ ]+)\\"/);

        if (!(match && match[1])) {
          throw new Error('Не удалось загрузить автар, обратитесь к создателю скрипта. Код ошибки: NO_MATCH');
        }

        const postIdMatches = GSettings.remote.post.match(/(\d+).html$/);

        if (!postIdMatches || !postIdMatches[1]) {
          throw new Error('Не удалось загрузить автар, обратитесь к создателю скрипта. Код ошибки: NO_POST_ID');
        }

        const commentBody = new FormData();
        commentBody.append('comment_text', '<img src="' + match[1] + '" alt="avatar">');
        commentBody.append('reply', '0');
        commentBody.append('cmt_target_id', postIdMatches[1]);
        commentBody.append('security_ls_key', securityLsKey.value);

        return fetch('https://tabun.everypony.ru/blog/ajaxaddcomment/', {
          method: 'POST',
          body: commentBody,
        })
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Не удалось загрузить автар, обратитесь к создателю скрипта. Код ошибки: ADD_COMMENT_ERR');
        }

        localStorage.setItem('TabunAvaReborn_LastUpdate', '0');
        window.location.reload();
      })
      .catch((error) => {
        alert(error.message);
      });
  });

  avatarUploadNode.addEventListener('click', (e) => {
    e.preventDefault();
    input.click();
  });
}

function replaceHeaderText() {
  if (GSettings.header_text) {
    const logoNode = document.querySelector('#logolink a');
    if (!logoNode) return;

    logoNode.text = GSettings.header_text;
  }
}

getSettings()
  .then((settings) => {
    GSettings = settings;

    initSettingsPage();
    initAvatarUpload();

    replaceHeaderText();

    loadAvatarsDictionary()
      .then(() => {

        new MutationObserver(replaceAvatarsOnCommentsRefresh).observe(document.querySelector('#content-wrapper'), {childList: true, subtree: true});
        new MutationObserver(replaceAvatarsOnRepliesRefresh).observe(document.querySelector('.tabun-replies-container'), {childList: true, subtree: true});

        replaceHeaderAvatar();
        replaceCommentAvatars();
        replaceTopicAuthorAvatars();
        replaceProfileAvatar();
        replaceProfileFriendAvatars();
        replaceStreamAvatars();
        replacePeopleAvatars();
        replaceDonationAvatars();
        replaceProfileSettingsAvatar();
      });
  })
