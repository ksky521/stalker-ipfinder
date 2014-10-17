var $ = {
    isIp: function isIp(ip) {
        if (typeof ip !== 'string') {
            return false;
        }
        var reg = /^\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}$/;
        return reg.test(ip);
    }
};

module.exports = $;
