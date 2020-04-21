#import <UIKit/UIKit.h>
#import "RCTBridgeModule.h"


@interface SNReactNative : NSObject <RCTBridgeModule>
@end

@implementation SNReactNative

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(exitApp)
{
    exit(0);
};

@end
