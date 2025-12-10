  // 修复核心：简化过滤逻辑，确保递归遍历所有自定义对象方法
    function getCustomWindowProps() {
        const excludeProps = new Set(['getCustomWindowProps', 'renderContent']);
        let nativeProps = new Set();

        // 1. 获取原生window的属性名（仅用于过滤window级原生属性）
        try {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            for (let prop in iframe.contentWindow) nativeProps.add(prop);
            document.body.removeChild(iframe);
        } catch (e) {
            console.error('获取原生属性失败：', e.message);
            return {methods: {}, objects: {}, values: {}};
        }

        // 修复点1：简化辅助函数，移除错误的原生对象过滤逻辑
        // 核心：只过滤原生方法（[native code]），不过滤自定义对象的递归
        const getObjectMethods = (obj, parentName = '') => {
            const methods = {};
            // 终止条件：非对象/空/循环引用（指向window）
            if (typeof obj !== 'object' || obj === null || obj === window) {
                return methods;
            }

            // 遍历当前对象的所有可枚举属性
            Object.keys(obj).forEach(key => {
                try {
                    const val = obj[key];
                    // 只收集自定义方法（排除原生方法）
                    if (typeof val === 'function') {
                        const fnStr = val.toString();
                        if (!fnStr.includes('[native code]')) {
                            const fullKey = parentName ? `${parentName}.${key}` : key;
                            methods[fullKey] = val;
                        }
                    }
                    // 修复点2：递归遍历子对象（所有非原生方法的对象都递归）
                    if (typeof val === 'object' && val !== null && val !== window) {
                        Object.assign(methods, getObjectMethods(val, parentName ? `${parentName}.${key}` : key));
                    }
                } catch (e) {
                    console.warn(`遍历属性 ${key} 失败：`, e.message);
                    return;
                }
            });
            return methods;
        };

        // 筛选window级自定义内容
        const result = {methods: {}, objects: {}, values: {}};
        for (let prop in window) {
            try {
                // 跳过：原生属性 | 自身代码属性 | 不可枚举属性
                const descriptor = Object.getOwnPropertyDescriptor(window, prop);
                if (nativeProps.has(prop) || excludeProps.has(prop) || (descriptor && !descriptor.enumerable)) {
                    continue;
                }

                const val = window[prop];
                // Window级方法：排除原生方法
                if (typeof val === 'function') {
                    if (!val.toString().includes('[native code]')) {
                        result.methods[prop] = val;
                    }
                }
                // Window级对象：收集并递归遍历内部方法
                else if (typeof val === 'object' && val !== null) {
                    result.objects[prop] = {
                        raw: val,
                        methods: getObjectMethods(val, prop) // 现在能正确收集内部方法
                    };
                }
                // Window级普通值
                else {
                    result.values[prop] = val;
                }
            } catch (e) {
                console.warn(`处理window属性 ${prop} 失败：`, e.message);
                continue;
            }
        }

        console.log(result.methods);

        Object.entries(result.objects).forEach(([objName, objInfo]) => {
            console.log(`对象名：${objName}`);
            console.log('  原始对象：', objInfo.raw);
            console.log('  内部方法：', objInfo.methods);
        });

        console.log(result.values);

        return result;
    }
