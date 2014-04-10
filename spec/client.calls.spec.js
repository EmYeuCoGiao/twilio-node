var twilio = require('../index');

describe('The Twilio REST Client Calls resource', function () {
    var client = new twilio.RestClient('AC123', '123');

    beforeEach(function() {
        spyOn(client, 'request');
    });

    it('initiates a call from a purchased twilio number', function() {
        client.calls.create({
            to:'+14158675309',
            from:'+16517779311',
            url:'https://demo.twilio.com/welcome/voice'
        });
        expect(client.request).toHaveBeenCalledWith({
            url:'/Accounts/AC123/Calls',
            method:'POST',
            form:{
                To:'+14158675309',
                From:'+16517779311',
                Url:'https://demo.twilio.com/welcome/voice'
            }
        }, undefined);
    });

    it('gets information about a specific call', function() {
        client.calls('CA123').get();
        expect(client.request).toHaveBeenCalledWith({
            url:'/Accounts/AC123/Calls/CA123',
            method:'GET',
            qs:{}
        }, undefined);
    });

    it('uses shorthand to make a call', function() {
        client.makeCall({
            to:'+14158675309',
            from:'+16517779311',
            url:'https://demo.twilio.com/welcome/voice'
        });
        expect(client.request).toHaveBeenCalledWith({
            url:'/Accounts/AC123/Calls',
            method:'POST',
            form:{
                To:'+14158675309',
                From:'+16517779311',
                Url:'https://demo.twilio.com/welcome/voice'
            }
        }, undefined);
    });

    it('gets a list of calls for a specific number', function() {
        client.calls.list({
            from:'+14158675309'
        });
        expect(client.request).toHaveBeenCalledWith({
            url:'/Accounts/AC123/Calls',
            method:'GET',
            qs:{
                From:'+14158675309'
            }
        }, undefined);
    });

    it('can create call feedback', function() {
        spyOn(client, 'request');
        client.calls(instanceSid).feedback.post({
            qualityScore:3,
            issue:'dropped-call'
        });
        expect(client.request).toHaveBeenCalled();
        expect(client.request).toHaveBeenCalledWith({
            'url': '/Accounts/' + config.accountSid + '/Calls/' + instanceSid + '/Feedback',
            'method': 'POST',
            'form': {
                'QualityScore': 3,
                'Issue': 'dropped-call'
            }
        }, undefined);
    });

    it('can get call feedback', function() {
        spyOn(client, 'request');
        client.calls(instanceSid).feedback.get()
        expect(client.request).toHaveBeenCalled();
        expect(client.request).toHaveBeenCalledWith({
            'url': '/Accounts/' + config.accountSid + '/Calls/' + instanceSid + '/Feedback',
            'method': 'GET',
            'qs': {}
        }, undefined);
    });

    it('can delete call feedback', function() {
        spyOn(client, 'request');
        client.calls(instanceSid).feedback.delete()
        expect(client.request).toHaveBeenCalled();
        expect(client.request).toHaveBeenCalledWith({
            'url': '/Accounts/' + config.accountSid + '/Calls/' + instanceSid + '/Feedback',
            'method': 'DELETE',
            'form': {}
        }, undefined);
    });
});