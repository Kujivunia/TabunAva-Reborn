// ==UserScript==
// @name         TabunAva Reborn
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Установка своего аватара на Табуне!
// @author       Kujivunia или Niko_de_Andjelo
// @match        https://tabun.everypony.ru/*
// @grant        none
// @license MIT
// ==/UserScript==
// Я не умею писать скрипты, поэтому "TabunAva" являет собой вольную переделку НЕ моего "Tabun Swarm" https://greasyfork.org/ru/scripts/400907-tabun-swarm
//IDENTICON: https://avatars.dicebear.com/styles/identicon
//Замена аватарок
var time = performance.now();
var time0 = performance.now();
var Avatar = "https://cdn.everypony.ru/static/local/avatar_" ;//Сокращение ссылок на аватарки
var identicon = "https://avatars.dicebear.com/api/identicon/:";
var identiconParams = ".svg?scale=100&size=24";
var avaPost = "https://tabun.everypony.ru/blog/uniblog/203681.html";
var commentInfo = document.getElementsByClassName('comment-info');
var comments = document.getElementsByClassName('comment');
var dictUserAva = new Object();
var topicHeader = document.getElementsByClassName('topic-header');
var avatarMale = Avatar + 'male_24x24.png';
var avatarFemale = Avatar + Avatar + 'female_24x24.png';

fetch(avaPost)
    .then((response) => {
    return response.text();
})
    .then((data) => {
    var parser = new DOMParser();
    var htmlDocument = parser.parseFromString(data, "text/html");
    comments = htmlDocument.getElementsByClassName('comment');
    console.log('Время выполнения загрузки поста для сбора аватарок, мс.: ', performance.now() - time);
    time = performance.now();
    //*****************************Выше была какая-то чёрная магия**********************************
    //Собираю аватарки из ава-поста.
    [].forEach.call(comments,function(element) {
        try
        {
            if (element.getElementsByClassName('comment-author')[0].children[0].children[0].src == (Avatar + 'male_24x24.png') || element.getElementsByClassName('comment-author')[0].children[0].children[0].src == (Avatar + 'female_24x24.png')){
                var temp = element.getElementsByClassName('comment-author');
                var name = temp[0].children[1].innerText;
                var tempComment = element.getElementsByClassName('comment-content')[0];
                if (tempComment.getElementsByClassName('text')[0].getElementsByTagName('img')[0] != null){
                    if (tempComment.getElementsByClassName('text')[0].getElementsByTagName('img')[0].hasAttribute('src')){
                        var tempAvaLink = tempComment.getElementsByClassName('text')[0].getElementsByTagName('img')[0].getAttribute('src');
                        dictUserAva[name] = tempAvaLink;
                    }
                }
            }
        }
        catch(e) {}
    });

    console.log('Время выполнения сбора аватарок, мс.: ', performance.now() - time);

    time = performance.now();

}).then(() => {

    //Функция, якая выставляет аватарки
    change_avatar();

    document.getElementById('count-comments').addEventListener('DOMSubtreeModified', function() { //Смотрит число комментариев и при изменении запускает смену аватарок. Без этого новые комментарии будут с обычными аватарками.
        change_avatar() });

});

document.getElementById('count-comments').addEventListener('DOMSubtreeModified', function() { //Смотрит число комментариев и при изменении запускает смену аватарок. Без этого новые комментарии будут с обычными аватарками.
    change_avatar() });

function change_avatar() {
    //Замена своей аватарки на плашке сверху
    var imgSrc = document.querySelector("#dropdown-user > a:nth-child(1) > img").src;
    var name = document.querySelector("#dropdown-user > a.username").outerText;
    console.log("="+imgSrc+"="+name);
    if (/(\/local\/avatar_male_)/.test(imgSrc) || /(\/local\/avatar_female)/.test(imgSrc)){
        if (dictUserAva[name])
        {
            document.querySelector("#dropdown-user > a:nth-child(1) > img").src = dictUserAva[name];
        }
        else
        {
            document.querySelector("#dropdown-user > a:nth-child(1) > img").src = identicon + name + identiconParams;
        }
    }
    console.log('Время выполнения замены своей аватарки на плашке сверху, мс.: ', performance.now() - time);
    time = performance.now();

    //Замена аватарок у комментариев внутри поста
    [].forEach.call(commentInfo,function(element) {
        if (element.getElementsByClassName('comment-author')[0].children[0].children[0].src == (Avatar + 'male_24x24.png') || element.getElementsByClassName('comment-author')[0].children[0].children[0].src == (Avatar + 'female_24x24.png')){
            var temp = element.getElementsByClassName('comment-author');
            var name = temp[0].children[1].innerText;
            if (dictUserAva[name])
            {
                temp[0].children[0].children[0].src = dictUserAva[name];
            }
            else
            {
                temp[0].children[0].children[0].src = identicon + name + identiconParams;
            }
        }
    });
    console.log('Время замены аватарок комментариев, мс.: ', performance.now() - time);
    time = performance.now();

    //Замена аватарок у поста
    [].forEach.call(topicHeader,function(element) {
        var temp = element.getElementsByClassName('avatar')[0];
        var imgSrcRegExp = new RegExp(temp.getAttribute('src'));
        if (imgSrcRegExp.test(avatarMale) || imgSrcRegExp.test(avatarFemale)){
            var name = element.getElementsByClassName('topic-info')[0].children[2].outerText;
            if (dictUserAva[name])
            {
                temp.src = dictUserAva[name];
            }
            else
            {
                temp.src = identicon + name + identiconParams;
            }
        }
    });
    console.log('Время замены аватарок шапок постов, мс.: ', performance.now() - time);
    time = performance.now();

    //Замена аватарок у профиля
    var profile = document.getElementById('content');
    name = document.querySelector("#content > div.profile > h2").outerText;
    imgSrc = document.querySelector("#content > div.profile-info-about > a.avatar > img").src;
    if (/(\/local\/avatar_male_)/.test(imgSrc) || /(\/local\/avatar_female)/.test(imgSrc)){
        if (dictUserAva[name])
        {
            document.querySelector("#content > div.profile-info-about > a.avatar > img").src = dictUserAva[name];
        }
        else
        {
            document.querySelector("#content > div.profile-info-about > a.avatar > img").src = identicon + name + identiconParams;
        }
    }
    console.log('Время выполнения замены аватарки профиля, мс.: ', performance.now() - time);
    time = performance.now();

    //Замена аватарок у друзей в профиле
    [].forEach.call(document.querySelector("#content > div.wrapper > div.profile-left > ul.user-list-avatar").getElementsByTagName('li'),function(element) {
        var name = element.children[0].outerText;
        var temp = element.children[0].getElementsByTagName('img')[0];
        var imgSrc = temp.getAttribute('src');
        var imgSrcRegExp = new RegExp(imgSrc);
        if (/(\/local\/avatar_male_)/.test(imgSrc) || /(\/local\/avatar_female)/.test(imgSrc)){
            temp.height = 48;
            temp.width = 48;
            if (dictUserAva[name])
            {
                temp.src = dictUserAva[name];
            }
            else
            {
                temp.src = identicon + name + ".svg?scale=100&size=48";
            }
        }
    });
    console.log('Время выполнения замены аватарок друзей в профиле, мс.: ', performance.now() - time);
    time = performance.now();
    //Замена аватарок в ленте активности
    //TODO

}
