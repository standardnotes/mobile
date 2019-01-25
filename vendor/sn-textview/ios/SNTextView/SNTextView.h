//
//  SNTextView.h
//  SNTextView
//
//  Created by mo on 9/25/17.
//  Copyright © 2017 standardnotes. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTComponent.h>

@interface SNTextView : UITextView

@property (nonatomic, copy) RCTBubblingEventBlock onChangeText;
@property (nonatomic, assign) UIScrollViewKeyboardDismissMode keyboardDismissMode;
@property (nonatomic, assign) UIKeyboardAppearance keyboardAppearance;
@property (nonatomic, assign) BOOL editable;
@property (nonatomic, assign) CGFloat paddingTop;
@property (nonatomic, assign) CGFloat paddingLeft;
@property (nonatomic, assign) CGFloat paddingRight;
@property (nonatomic, assign) CGFloat paddingBottom;

@end
