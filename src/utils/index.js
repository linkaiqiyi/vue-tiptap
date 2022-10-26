export const debounce = (fn, delay) => {
    var timer = null // 声明计时器
    return function () {
        var context = this
        var args = arguments
        clearTimeout(timer)
        timer = setTimeout(function () {
            fn.apply(context, args)
        }, delay)
    }
}

export const throttle = (fn, wait) => {
    let pre = Date.now()
    return function () {
        let context = this;
        let args = arguments;
        let now = Date.now();
        if (now - pre >= wait) {
            fn.apply(context, args);
            pre = Date.now();
        }
    }
}

// 将 data 格式化 为 string 类型
export const formatToString = data => {
    if (typeof data === 'object') return JSON.stringify(data)
    return data.toString()
}

// 将 data 格式化 为 object 类型
export const formatToObject = data => {
    if (typeof data === 'string') return JSON.parse(data)
    return data
}


