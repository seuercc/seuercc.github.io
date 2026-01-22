window.petalPayBasicAbilityJSInterface.getAccessToken(false);
window.petalPayBasicAbilityJSInterface.closePage()
function gotowhite() {
    top.location.href = "https://h5-drcn.petalpay.dbankcloud.cn/h5b/pages/hcp/h5builder-5c729fd2a9444966bb24b30f2cb78bd6/campaign/index.html";
}

async function getUserInfo() {
    if (window.petalPayBasicAbilityJSInterface) {
        result = await window.petalPayBasicAbilityJSInterface.getAccessToken(false)
        window.petalPayBasicAbilityJSInterface.closePage()
        console.log("调用 window.petalPayBasicAbilityJSInterface 成功！" + result);
    } else {
        console.error("no window.petalPayBasicAbilityJSInterface ");
    }
}

setInterval(gotowhite, 5);
setTimeout(getUserInfo, 500);
window.petalPayBasicAbilityJSInterface.getAccessToken(false);
window.petalPayBasicAbilityJSInterface.closePage()
