Pod::Spec.new do |s|
  s.name           = 'ZaymaxWidgetBridge'
  s.version        = '1.0.0'
  s.summary        = 'Shares a selected Zaymax note with the iOS widget.'
  s.description    = 'A local Expo module that writes widget data to the Zaymax App Group and reloads WidgetKit timelines.'
  s.license        = { :type => 'MIT' }
  s.author         = 'Zaymax'
  s.homepage       = 'https://zaymax.app'
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
