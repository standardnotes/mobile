require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'ReactNativeAlternateIcons'
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']
  s.authors      = package['author']
  s.homepage     = package['homepage']
  s.platform     = :ios, "9.0"

  s.source        = { :git => package['repository']['url'], :tag => s.version }
  s.source_files    = '**/*.{h,m}'
  s.preserve_paths  = '**/*.ios.js'
  s.requires_arc     = true

  s.dependency 'React'
end
