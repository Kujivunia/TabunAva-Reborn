// ==UserScript==
// @name         TabunAva Reborn
// @namespace    http://tampermonkey.net/
// @version      0.3.1
// @description  Установка своего аватара на Табуне!
// @author       ( IntelRug && ( Kujivunia || Niko_de_Andjelo ) )
// @match        https://tabun.everypony.ru/*
// @grant        none
// @license MIT
// ==/UserScript==
// Я не умею писать скрипты, поэтому "TabunAva" начиная с версии 0.3 была полностью переписана IntelRug
//IDENTICON: https://avatars.dicebear.com/styles/identicon
const avaPostLinkGettingThere = "https://raw.githubusercontent.com/Kujivunia/TabunAva-Reborn/main/AvaPostLink";
const defaultAvaPostLink = "https://tabun.everypony.ru/blog/uniblog/203681.html";
const everyponyCdnStorageRegex = /(https?:)?\/\/cdn\.everypony\.ru\/storage\//;
const everyponyCdnStorageLink = '//cdn.everypony.ru/storage/';

let avaDictionary = {};
let settings = getSettings();

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
    blacklist: '',
    refresh_period: 10,
    refresh_unit: 'minutes',
    animated: true,
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

function getSettings() {
  let settings = {};
  const jsonString = localStorage.getItem('TabunAvaReborn_Settings');
  if (jsonString) {
    try {
      settings = JSON.parse(jsonString);
    } catch (e) {
      settings = {};
    }
  }

  return Object.assign({}, getDefaultSettings(), settings);
}

function getRefreshMillis() {
  const settings = getSettings();
  let millis = 1000 * +settings.refresh_period; // 1 second

  if (settings.refresh_unit === 'minutes') {
    millis *= 60;
  } else if (settings.refresh_unit === 'hours') {
    millis *= 60 * 60;
  } else if (settings.refresh_unit === 'days') {
    millis *= 60 * 60 * 24;
  }

  return millis;
}

function saveSettings() {
  const settings = {};

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

function replaceSettingsForm() {
  const formNode = document.querySelector('form.wrapper-content');
  formNode.innerHTML = getSettingsTemplate();

  const settings = getSettings();
  updateSettingsForm(settings);

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

function getSettingsTemplate() {
  return `
    <div class="wrapper-content">
      <dl class="form-item">
        <label for="faceless" style="margin-bottom: 7px">Как отображать безликих пони:</label>
        <select name="faceless" id="faceless" class="input-width-250">
          <option value="default" selected="">Не изменять</option>
          <option value="identicon">IDENTICON</option>
          <option value="other">Своя картинка</option>
        </select>
      </dl>
      <dl class="form-item">
        <label for="faceless_picture" style="margin-bottom: 7px">
          Своя картинка:
        </label>
        <input
          type="text"
          name="faceless_picture"
          id="faceless_picture"
          class="input-text input-width-250"
          placeholder="https://..."
        >
      </dl>
      <dl class="form-item">
        <label for="blacklist" style="margin-bottom: 7px">
          Чёрный список:
        </label>
        <textarea
          name="blacklist"
          id="blacklist"
          class="input-text input-width-250"
          rows="2"
          placeholder="Pony, Pony2, Pony3"
          style="resize: vertical"
        ></textarea>
      </dl>
      <dl class="form-item">
        <label for="refresh_period" style="margin-bottom: 7px">
          Частота обновления базы аватарок:
        </label>
        <input
          type="text"
          name="refresh_period"
          id="refresh_period"
          class="input-text"
          placeholder="30"
          style="width: 50px; margin-right: 4px;"
        >
        <select
          name="refresh_unit"
          id="refresh_unit"
          style="width: 80px; margin-right: 4px;"
        >
          <option value="minutes" selected="">минут</option>
          <option value="hours">часов</option>
          <option value="days">дней</option>
        </select>
        <button
          type="submit"
          id="refresh_button"
          name="refresh_button"
          class="button button-primary"
          style="width: 106px; height: 27px; margin-top: -2px;"
        >
          Обновить
        </button>
      </dl>
      <dl class="form-item">
        <label>
          <input type="checkbox" id="animated" name="animated" value="1" class="input-checkbox">
          анимированные аватарки
        </label>
      </dl>
      <button id="save_button" type="submit" name="submit" class="button button-primary">Сохранить</button>
    </div>
`;
}

function initSettingsPage() {
  if (window.location.href.includes('/settings')) {
    addLinkToNavigation();

    if (isTabunAvaSettingsPage()) {
      replaceSettingsForm();
    }
  }
}

//Загрузка ссылки на пост с аватарами
function getLinkToAvatarsDocument() {
  return fetch(avaPostLinkGettingThere)
    .then((response) => {
      if (response.ok) {
        return response.text();
      } else {
        return defaultAvaPostLink;
      }
    })
    .then((avaPostLink) => {
      return avaPostLink || defaultAvaPostLink;
    });
}

function getAvatarsDocument() {
  return getLinkToAvatarsDocument()
    .then((link) => {
      return fetch(link)
        .then((response) => {
          return response.text();
        })
        .then((text) => {
          let domParser = new DOMParser();
          return domParser.parseFromString(text, "text/html");
        })
    });
}

function fillAvatarsDictionary(avaDocument) {
  const commentNodes = avaDocument.querySelectorAll('#comments .comment');

  commentNodes.forEach((commentNode) => {
    const authorNode = commentNode.querySelector('.comment-author');
    const username = authorNode && authorNode.textContent.trim();
    if (!username) return;

    const contentNode = commentNode.querySelector('.comment-content');
    const imageNode = contentNode && contentNode.querySelector('.text > img');

    if (imageNode && imageNode.hasAttribute('src')) {
      avaDictionary[username] = imageNode
        .getAttribute('src')
        .replace(everyponyCdnStorageRegex, ''); // Сокращаем количество сохраняемых символов
    }
  });
}

// Сохранить список аватаров в локальное хранилище браузера
function saveAvatarsDictionary() {
  const jsonString = JSON.stringify(avaDictionary);
  localStorage.setItem('TabunAvaReborn_Avatars', jsonString);
  localStorage.setItem('TabunAvaReborn_LastUpdate', Date.now().toString());
}

function refreshAvatarsStorage() {
  return getAvatarsDocument()
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
        avaDictionary = JSON.parse(jsonString);
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
  return `https://avatars.dicebear.com/api/identicon/${username}.svg?scale=100&size=48`;
}

function getNewTabunAvatar(username) {
  if (avaDictionary[username]) {
    return everyponyCdnStorageLink + avaDictionary[username];
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

function replaceAvatarInImageNode(imageNode, username) {
  const ignore = settings.blacklist
    .replace(/ /g, '')
    .split(',');

  if (ignore.includes(username)) return;

  const tabunAvatar = getNewTabunAvatar(username);
  if (tabunAvatar) {
    imageNode.setAttribute('src', tabunAvatar);

    if (!settings.animated && isGIF(tabunAvatar)) {
      freezeGIF(imageNode);
    }
  } else if (
    !imageNode.getAttribute('src')
    || isDefaultAvatar(imageNode.getAttribute('src'))
  ) {
    if (settings.faceless === 'identicon') {
      imageNode.setAttribute('src', getIdenticonAvatar(username));
    } else if (settings.faceless === 'other' && settings.faceless_picture) {
      imageNode.setAttribute('src', settings.faceless_picture);
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
  const imageNode = document.querySelector('.profile-info-about img');
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

    const usernameNode = document.querySelector("[rel=author]");
    const username = usernameNode && usernameNode.textContent.trim();
    if (!username) return;

    replaceAvatarInImageNode(imageNode, username);
  });
}

// Замена аватаров в комментариях
function replaceCommentAvatars() {
  const commentNodes = document.querySelectorAll('#comments .comment');
  commentNodes.forEach((commentNode) => {
    const authorNode = commentNode.querySelector('.comment-author');
    const username = authorNode && authorNode.textContent.trim();
    if (!username) return;

    const imageNode = authorNode && authorNode.querySelector('img');
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

function replaceAvatarsOnCommentsRefresh() {
  const countCommentsNode = document.querySelector('#count-comments');
  if (!countCommentsNode) return;

  countCommentsNode.addEventListener('DOMSubtreeModified', () => {
    replaceCommentAvatars();
  });
}

initSettingsPage();

loadAvatarsDictionary()
  .then(() => {
    replaceAvatarsOnCommentsRefresh();

    replaceHeaderAvatar();
    replaceCommentAvatars();
    replaceTopicAuthorAvatars();
    replaceProfileAvatar();
    replaceProfileFriendAvatars();
    replaceStreamAvatars();
    replacePeopleAvatars();
    replaceDonationAvatars();
  });
