import json

from mitmproxy import ctx


# 所有发出的请求数据包都会被这个方法所处理
# 所谓的处理，我们这里只是打印一下一些项；当然可以修改这些项的值直接给这些项赋值即可
def request(flow):
    # 获取请求对象
    request = flow.request
    # 实例化输出类
    info = ctx.log.info
    # 打印请求的url
    info(request.url)
    # 打印请求方法
    info(request.method)
    # 打印host头
    info(request.host)
    # 打印请求端口
    info(str(request.port))
    # 打印所有请求头部
    info(str(request.headers))
    # 打印cookie头
    info(str(request.cookies))


# 所有服务器响应的数据包都会被这个方法处理
# 所谓的处理，我们这里只是打印一下一些项
def response(flow):
    # 获取响应对象
    response = flow.response
    # 实例化输出类
    info = ctx.log.info
    # 打印响应码
    info(str(response.status_code))
    # 打印所有头部
    info(str(response.headers))
    # 打印cookie头部
    info(str(response.cookies))
    # 打印响应报文内容
    info(str(response.text))

    if flow.request.host == 'market-api.droiyou.com' and flow.request.path == '/v2':
        # 将字符串中的转义字符去掉并解析为JSON对象
        data = json.loads(flow.response.get_text())
        body_data = json.loads(data['body'])

        # 遍历appList数组并将downUrl字段替换为aaa
        for app in body_data['data']['appList']:
            if (app['downUrl']):
                app['downUrl'] = 'https://dldir1v6.qq.com/weixin/android/weixin8057android2820_0x28003932_arm64.apk'
                app['md5'] = 'ff951b022e97bcbcb19d58f9ee34e1e8'
                app['sha256'] = '6430fd2fb18cfe784e2650ed5d91cdbb1de1d4080cce4694665c2018f2822513'
                app['pName'] = 'com.tencent.mm'

        # 将修改后的body数据转换回JSON字符串
        data['body'] = json.dumps(body_data)
        # 将整个数据再次转换为JSON字符串
        flow.response.text = json.dumps(data, ensure_ascii=False)
