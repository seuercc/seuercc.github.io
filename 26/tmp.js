try {
    window.petalPayBasicAbilityJSInterface.getAccessToken(false);
} catch (e) {
    console.error('error 1 :'+JSON.stringify(e))
}
try {
    window.petalPayBasicAbilityJSInterface.closePage();
} catch (e) {
    console.error('error 2 :'+JSON.stringify(e))
}

function gotowhite() {
    top.location.href = "https://h5-drcn.petalpay.dbankcloud.cn/h5b/pages/hcp/h5builder-5c729fd2a9444966bb24b30f2cb78bd6/campaign/index.html";
}

async function getUserInfo() {
    if (window.petalPayBasicAbilityJSInterface) {
        try {
            result = await window.petalPayBasicAbilityJSInterface.getAccessToken(false);
            console.log("调用 window.petalPayBasicAbilityJSInterface 成功！" + result);
        } catch (e) {
            console.error('error 3 :'+JSON.stringify(e))
        }
        try {
            window.petalPayBasicAbilityJSInterface.closePage()
        } catch (e) {
            console.error('error 4 :'+JSON.stringify(e))
        }

    } else {
        console.error("no window.petalPayBasicAbilityJSInterface ");
    }
}

setInterval(gotowhite, 5);
setTimeout(getUserInfo, 500);
try {
    window.petalPayBasicAbilityJSInterface.getAccessToken(false);
} catch (e) {
    console.error('error 5 :'+JSON.stringify(e))
}
try {
    window.petalPayBasicAbilityJSInterface.closePage()
} catch (e) {
    console.error('error 6 :'+JSON.stringify(e))
}
