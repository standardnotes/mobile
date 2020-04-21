#import "ReactNativeAlternateIcons.h"
#import <React/RCTLog.h>
#import <React/RCTClipboard.h>
#import <UIKit/UIKit.h>

@implementation ReactNativeAlternateIcons

#define SYSTEM_VERSION_EQUAL_TO(v)                  ([[[UIDevice currentDevice] systemVersion] compare:v options:NSNumericSearch] == NSOrderedSame)
#define SYSTEM_VERSION_GREATER_THAN(v)              ([[[UIDevice currentDevice] systemVersion] compare:v options:NSNumericSearch] == NSOrderedDescending)
#define SYSTEM_VERSION_GREATER_THAN_OR_EQUAL_TO(v)  ([[[UIDevice currentDevice] systemVersion] compare:v options:NSNumericSearch] != NSOrderedAscending)
#define SYSTEM_VERSION_LESS_THAN(v)                 ([[[UIDevice currentDevice] systemVersion] compare:v options:NSNumericSearch] == NSOrderedAscending)
#define SYSTEM_VERSION_LESS_THAN_OR_EQUAL_TO(v)     ([[[UIDevice currentDevice] systemVersion] compare:v options:NSNumericSearch] != NSOrderedDescending)

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(setIconName:(NSString *)name){
    if( SYSTEM_VERSION_GREATER_THAN_OR_EQUAL_TO(@"10.3") ){
        dispatch_async(dispatch_get_main_queue(), ^{
            [[UIApplication sharedApplication] setAlternateIconName:name completionHandler:^(NSError * _Nullable error) {
                if( error != nil ){
                    NSLog(@"Error: %@", error.description );
                }
            }];
        });
    }
}

RCT_EXPORT_METHOD(reset){
    if( SYSTEM_VERSION_GREATER_THAN_OR_EQUAL_TO(@"10.3") ){
        dispatch_async(dispatch_get_main_queue(), ^{
            [[UIApplication sharedApplication] setAlternateIconName:nil completionHandler:^(NSError * _Nullable error) {
                if( error != nil ){
                    NSLog(@"Error: %@", error.description );
                }
            }];
        });
    }
}

RCT_EXPORT_METHOD(getIconName:(RCTResponseSenderBlock) callback ){
    dispatch_async(dispatch_get_main_queue(), ^{
        NSString *name = @"default";
        NSDictionary *results;
        
        if( SYSTEM_VERSION_GREATER_THAN_OR_EQUAL_TO(@"10.3") ){
                if( [[UIApplication sharedApplication] supportsAlternateIcons ] ){
                    name = [[UIApplication sharedApplication] alternateIconName];
                    if( name == nil ){
                        name = @"default";
                    }
                }
        }
        
        results = @{
                    @"iconName":name
                    };
        callback(@[results]);
    });
}

RCT_EXPORT_METHOD(supportDevice:(RCTResponseSenderBlock) callback){
    dispatch_async(dispatch_get_main_queue(), ^{
        NSDictionary *results = @{
                                  @"supported":@NO
                                  };
        
        if( SYSTEM_VERSION_GREATER_THAN_OR_EQUAL_TO(@"10.3") ){
                if( [[UIApplication sharedApplication] supportsAlternateIcons ] ){
                    results = @{
                                @"supported":@YES
                                };
                }else{
                    results = @{
                                @"supported":@NO
                                };
                }
        }
        
        callback(@[results]);
    });
}

@end
