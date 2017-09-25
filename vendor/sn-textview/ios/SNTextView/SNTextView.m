//
//  SNTextView.m
//  SNTextView
//
//  Created by mo on 9/25/17.
//  Copyright © 2017 standardnotes. All rights reserved.
//

#import "SNTextView.h"

@implementation SNTextView
{
    BOOL didLayout;
}

- (instancetype)init {
    if(self = [super init]) {
        
        __weak typeof(self) weakself = self;
        
        self.contentInset = UIEdgeInsetsZero;
    
        [[NSNotificationCenter defaultCenter] addObserverForName:UIKeyboardDidShowNotification object:nil queue:[NSOperationQueue mainQueue] usingBlock:^(NSNotification * _Nonnull note) {
            CGSize keyboardSize = [[[note userInfo] objectForKey:UIKeyboardFrameEndUserInfoKey] CGRectValue].size;
            UIEdgeInsets insets = UIEdgeInsetsMake(0, 0, keyboardSize.height, 0);
            weakself.contentInset = insets;
            weakself.scrollIndicatorInsets = insets;
        }];
        
        [[NSNotificationCenter defaultCenter] addObserverForName:UIKeyboardWillHideNotification object:nil queue:[NSOperationQueue mainQueue] usingBlock:^(NSNotification * _Nonnull note) {
            UIEdgeInsets insets = UIEdgeInsetsZero;
            weakself.contentInset = insets;
            weakself.scrollIndicatorInsets = insets;
        }];
    }
    return self;
}

- (void)layoutSubviews {
    [super layoutSubviews];
    
    // There's an issue where a large blob of text without paragraphs will start at the bottom.
    // This makes it go up to the top
    if(!didLayout) {
        didLayout = true;
        [self setContentOffset:CGPointZero];
    }
}

- (void)setPaddingTop:(CGFloat)paddingTop
{
    _paddingTop = paddingTop;
    
    UIEdgeInsets insets = self.textContainerInset;
    [self setPaddingTop:paddingTop left:insets.left bottom:insets.bottom right:insets.right];
}

- (void)setPaddingLeft:(CGFloat)paddingLeft
{
    _paddingLeft = paddingLeft;
    
    UIEdgeInsets insets = self.textContainerInset;
    [self setPaddingTop:insets.top left:paddingLeft bottom:insets.bottom right:insets.right];
}

- (void)setPaddingBottom:(CGFloat)paddingBottom
{
    _paddingBottom = paddingBottom;
    
    UIEdgeInsets insets = self.textContainerInset;
    [self setPaddingTop:insets.top left:insets.left bottom:paddingBottom right:insets.right];
}

- (void)setPaddingRight:(CGFloat)paddingRight
{
    _paddingRight = paddingRight;
    
    UIEdgeInsets insets = self.textContainerInset;
    [self setPaddingTop:insets.top left:insets.left bottom:insets.bottom right:paddingRight];
}

- (void)setPaddingTop:(CGFloat)top left:(CGFloat)left bottom:(CGFloat)bottom right:(CGFloat)right
{
    UIEdgeInsets insets = UIEdgeInsetsMake(top, left, bottom, right);
    self.textContainerInset = insets;
}

@end
