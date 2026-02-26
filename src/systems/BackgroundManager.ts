export interface ChapterConfig {
  name: string
  levelRange: [number, number]
  backgrounds: string[]
  theme: string
}

export class BackgroundManager {
  private scene: Phaser.Scene
  private chapters: Map<string, ChapterConfig>
  private loadedTextures: Set<string>
  private textureCache: Map<string, Phaser.Textures.Texture>
  private readonly MAX_CACHED_BACKGROUNDS = 10
  private readonly PRELOAD_COUNT = 2
  private currentChapter: string = ''
  private currentLevel: number = 1
  private beastModePool: string[] = []
  private lastBeastModeRotation: number = 0
  private backgroundUrls: Map<string, string>
  private beastModeLoadingProgress: number = 0
  private beastModeFullyLoaded: boolean = false
  private loadingBatches: string[][] = []
  private progressiveLoadTimer?: Phaser.Time.TimerEvent

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.loadedTextures = new Set()
    this.textureCache = new Map()
    this.chapters = new Map()
    this.backgroundUrls = new Map()
    
    this.initializeChapters()
    this.initializeBackgroundUrls()
  }

  private initializeChapters(): void {
    // Initialize chapter structure
    this.chapters.set('crystal_cavern', {
      name: 'Crystal Cavern',
      levelRange: [1, 10],
      backgrounds: [
        'crystal-cavern-1',
        'crystal-cavern-2',
        'crystal-cavern-3',
        'crystal-cavern-4',
        'crystal-cavern-5',
        'crystal-cavern-6',
        'crystal-cavern-7',
        'crystal-cavern-8',
        'crystal-cavern-9',
        'crystal-cavern-10'
      ],
      theme: 'underground crystal caves with glowing gems'
    })

    this.chapters.set('volcanic_crystal', {
      name: 'Volcanic Crystal Cavern',
      levelRange: [11, 20],
      backgrounds: [
        'volcanic-crystal-1',
        'volcanic-crystal-2',
        'volcanic-crystal-3',
        'volcanic-crystal-4',
        'volcanic-crystal-5',
        'volcanic-crystal-6',
        'volcanic-crystal-7',
        'volcanic-crystal-8',
        'volcanic-crystal-9',
        'volcanic-crystal-10'
      ],
      theme: 'lava-infused crystal formations, heat effects'
    })

    this.chapters.set('steampunk', {
      name: 'Steampunk Crystal Cavern',
      levelRange: [21, 30],
      backgrounds: [
        'steampunk-1',
        'steampunk-2',
        'steampunk-3',
        'steampunk-4',
        'steampunk-5',
        'steampunk-6',
        'steampunk-7',
        'steampunk-8',
        'steampunk-9',
        'steampunk-10'
      ],
      theme: 'industrial machinery, gears, steam pipes'
    })

    this.chapters.set('storm', {
      name: 'Electrified Crystal Cavern',
      levelRange: [31, 40],
      backgrounds: [
        'electrified-1',
        'electrified-2',
        'electrified-3',
        'electrified-4',
        'electrified-5',
        'electrified-6',
        'electrified-7',
        'electrified-8',
        'electrified-9',
        'electrified-10'
      ],
      theme: 'lightning, clouds, turbulent weather'
    })

    this.chapters.set('galactic', {
      name: 'Galactic Crystal Cavern',
      levelRange: [41, 50],
      backgrounds: [
        'galactic-1',
        'galactic-2',
        'galactic-3',
        'galactic-4',
        'galactic-5',
        'galactic-6',
        'galactic-7',
        'galactic-8',
        'galactic-9',
        'galactic-10'
      ],
      theme: 'space, stars, nebulae, cosmic themes'
    })

    this.chapters.set('beast_mode', {
      name: 'Beast Mode',
      levelRange: [51, Infinity],
      backgrounds: [
        'beast-mode-1',
        'beast-mode-2',
        'beast-mode-3',
        'beast-mode-4',
        'beast-mode-5',
        'beast-mode-6',
        'beast-mode-7',
        'beast-mode-8',
        'beast-mode-9',
        'beast-mode-10',
        'beast-mode-11',
        'beast-mode-12',
        'beast-mode-13'
      ],
      theme: 'random pool from all chapters plus exclusive beast backgrounds'
    })

    this.chapters.set('bonus', {
      name: 'Special Bonus',
      levelRange: [-1, -1], // Special identifier for bonus levels
      backgrounds: [
        'bonus-1',
        'bonus-2',
        'bonus-3',
        'bonus-4',
        'bonus-5',
        'bonus-6',
        'bonus-7'
      ],
      theme: 'unique backgrounds for bonus levels'
    })
  }

  private initializeBackgroundUrls(): void {
    // Volcanic Crystal Cavern backgrounds
    this.backgroundUrls.set('volcanic-crystal-1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2011-GZe4EOiyQqMVmrL1suPvCfj2H7XRyU.png?h8lo')
    this.backgroundUrls.set('volcanic-crystal-2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2012-Xpfr4nKJX0JcfLlrjZxaw0UVKr3xRJ.png?VTjY')
    this.backgroundUrls.set('volcanic-crystal-3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2013-5VWrULlkLRSqGhIPYBKAGOlY7cvDJs.png?spcG')
    this.backgroundUrls.set('volcanic-crystal-4', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2014-1gw8iVsW1NFUtTX9qkrCaOkzceXgZa.png?uJJ4')
    this.backgroundUrls.set('volcanic-crystal-5', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2015-My6wxLCAKkrjp7DnRUhTTNzy4pGzNz.png?wogd')
    this.backgroundUrls.set('volcanic-crystal-6', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2016-HvPApBdJnsvIKOHL12BVv7OOCRvtXl.png?JpAr')
    this.backgroundUrls.set('volcanic-crystal-7', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2017-M4H2arE4cKPFCFnWvPKeO75XQhGeTr.png?aP8G')
    this.backgroundUrls.set('volcanic-crystal-8', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2018-EaBUdUtkhdA9O7UPGhUzbCSufw5Id3.png?7XYw')
    this.backgroundUrls.set('volcanic-crystal-9', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2019-ypt8lxgxyGduFRNsmei09BL2mKGIYH.png?ojyx')
    this.backgroundUrls.set('volcanic-crystal-10', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2020-VoCdHbTIAHWaULUuJAu1kL8TiARBUM.png?CK3z')
    
    // Steampunk backgrounds
    this.backgroundUrls.set('steampunk-1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2021-DPL9BM5HXEAbpVzWP2BTZAfO33f54v.png?1fKU')
    this.backgroundUrls.set('steampunk-2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2022-qDjjzq1C2FmwcHMYRZTzpaGej0yGwb.png?5CrH')
    this.backgroundUrls.set('steampunk-3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2023-lLNjfzk4mhhPURUbkfRTMNdLplNM22.png?uDB5')
    this.backgroundUrls.set('steampunk-4', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2024-Krew0eCXapHP78qdwQrgTp7Pvy9IMQ.png?tp0E')
    this.backgroundUrls.set('steampunk-5', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2025-bROe8HWWQGVwbIcF2TrA4E3jOprfVJ.png?Z70l')
    this.backgroundUrls.set('steampunk-6', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2026-UTEcGMcuwl5X6QRJj3TEmJxuQMtAVB.png?YEJ9')
    this.backgroundUrls.set('steampunk-7', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2027-QsWK3rAAwdnMlTzY0zQlIQlqYIeZoe.png?v371')
    this.backgroundUrls.set('steampunk-8', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2028-qunz3jvjcvUy0scMr4b18HIWuEABkb.png?DG4r')
    this.backgroundUrls.set('steampunk-9', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2029-metaGhO5uoqBktHCQnoqNmrXrancE4.png?XeH2')
    this.backgroundUrls.set('steampunk-10', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2030-qYeBT9cn6x3uAG4WvPeSa3clML1HpD.png?As4y')
    
    // Electrified backgrounds
    this.backgroundUrls.set('electrified-1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2031-O06tOHxb8b80yfdepBVLj3wJjNDMju.png?ILXr')
    this.backgroundUrls.set('electrified-2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2032-1YFN1MhcMfKXh149SshcFyW07KBHCG.png?PXOw')
    this.backgroundUrls.set('electrified-3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2033-ve4BB0Wu6RoMblkZbGmx2ST3IyfWHn.png?6pEl')
    this.backgroundUrls.set('electrified-4', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2034-9DMyTcBY2QhKKTskDe6bzWXRZsgLlT.png?Hr6t')
    this.backgroundUrls.set('electrified-5', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2035-qNc9FoZH60Awf13ISIvHpDNSNJifFq.png?Dagv')
    this.backgroundUrls.set('electrified-6', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2036-365hGJnOHpzVyTOpa1618kVJMi6UlX.png?DkAI')
    this.backgroundUrls.set('electrified-7', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2037-KOs54KffvnmZRGfkzDmk3GRvpjQ7mg.png?Edo8')
    this.backgroundUrls.set('electrified-8', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2038-oU56rbW3kuE6MYNXgMgvasvWprLYu4.png?f0hH')
    this.backgroundUrls.set('electrified-9', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2039-4xcZEcBBGlY6iMfY9CO5qh6CtjIbDe.png?otb6')
    this.backgroundUrls.set('electrified-10', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2040-Dr5Q2cJ64opY0LX1D8wIyzMhKfcaEY.png?CbYG')
    
    // Galactic backgrounds
    this.backgroundUrls.set('galactic-1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2041-ojno2HZouD4Dt2V1Z8lPT8g9TkR4ie.png?zuLt')
    this.backgroundUrls.set('galactic-2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2042-zErQ0r8sKPMfgFQwVz0s3ZiGFbdWHA.png?Dppy')
    this.backgroundUrls.set('galactic-3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2043-RNzRiZW56aIS7iwgav4eUdiwLVjXeD.png?twVY')
    this.backgroundUrls.set('galactic-4', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2044-gn593N3qTHsJT0UPP8gegOuTUMo1y5.png?oLhA')
    this.backgroundUrls.set('galactic-5', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2045-eZS62LEmA5ziCPOdP2Q4F03IIqppAj.png?GGbK')
    this.backgroundUrls.set('galactic-6', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2046-FblgXgSZg6UsQw0SjYc2kIiHh0KH2P.png?CjZV')
    this.backgroundUrls.set('galactic-7', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2047-MZmOHh8GVZiGayV8U0klva12TlXzFq.png?0Irb')
    this.backgroundUrls.set('galactic-8', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2048-4AZugPAFLnrLSulJNqKCiApLZwTYu6.png?3oKl')
    this.backgroundUrls.set('galactic-9', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2049-MqGMDTShcuUgAj5bNZJITaKkhOjNhR.png?iYFP')
    this.backgroundUrls.set('galactic-10', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2050-ff9za6km5crBBMDI3SCAAMmFudZq8E.png?s174')
    
    // Bonus backgrounds
    this.backgroundUrls.set('bonus-1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/bonus%201-sSavRhv3PSULBYqZTyGpCnPdMjhAq2.png?5PEU')
    this.backgroundUrls.set('bonus-2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/bonus%202-w0skJJAvJH9cYfQluphIJQwMFJpgK3.png?q77P')
    this.backgroundUrls.set('bonus-3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/bonus%203-kn73QdXKclD3LrMf3BXOH4B3ujbuxN.png?t9Nv')
    this.backgroundUrls.set('bonus-4', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/bonus%204-opRR6rXctR8XkRkQIo5LfITdiyHhzq.png?Yubo')
    this.backgroundUrls.set('bonus-5', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/bonus%205-FOtt55z5rVDYStfszLrUJRnnpovVMb.png?RCnr')
    this.backgroundUrls.set('bonus-6', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/bonus%206-mAMzjvs6bdoK8SLuFaztJphnDOLA9U.png?j0bG')
    this.backgroundUrls.set('bonus-7', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/bonus%207-9aPLVTEEDFoFgelvBQTC9ISErnYBCj.png?Ongz')
    
    // Beast Mode backgrounds
    this.backgroundUrls.set('beast-mode-1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%201-sRb0H9ErQnF9lBm5DuUzqtpwbZkRVS.png?3q8c')
    this.backgroundUrls.set('beast-mode-2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%202-LUcNgytry1u8MpUxWVGimvuMvTIVAT.png?vxmF')
    this.backgroundUrls.set('beast-mode-3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%203-goZNWmCpFDdm6dGhQdNO7CkgPLwqME.png?ExJw')
    this.backgroundUrls.set('beast-mode-4', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%204-d2C0xeqQEzBvpaqO7diW0kqqPLOsk6.png?xmRP')
    this.backgroundUrls.set('beast-mode-5', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%205-dCQCUxMIvQGPsWXKVh8hzq3dX8M7TA.png?M3Hi')
    this.backgroundUrls.set('beast-mode-6', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%206-eOFodTEiDxDZUN3E4wIMGwzxUJ8QIK.png?1gGD')
    this.backgroundUrls.set('beast-mode-7', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%207-TmIgs4UZyBWqt2718z94QbOAdLdlcS.png?iWFS')
    this.backgroundUrls.set('beast-mode-8', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%208-vkOQZUrtkY7OX8U7lF5G9QCnRGKYq0.png?26ru')
    this.backgroundUrls.set('beast-mode-9', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%209-3U9nvV48tv4NvvdFgqprbv3HcVgGg1.png?tx2Q')
    this.backgroundUrls.set('beast-mode-10', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%2010-9N8a5M5G9wI0OVoSMXBhlHPqaLg2d2.png?mPP6')
    this.backgroundUrls.set('beast-mode-11', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%2011-ujFZSIcr0VPwhT4smr13EPziNY4kEa.png?Rnqv')
    this.backgroundUrls.set('beast-mode-12', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%2012-hjyMpMwqW5hKpVPAsFGPaxuD5RaC7B.png?A52X')
    this.backgroundUrls.set('beast-mode-13', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%2013-iekgQPJN2LYhyLP6LETjP8hkD2IlnD.png?3eMk')
  }

  public getChapterForLevel(level: number, isBonus: boolean = false): string {
    // Check if this is a bonus level (passed as parameter from LevelManager)
    if (isBonus) return 'bonus'
    
    if (level >= 51) return 'beast_mode'
    if (level >= 41) return 'galactic'
    if (level >= 31) return 'storm'
    if (level >= 21) return 'steampunk'
    if (level >= 11) return 'volcanic_crystal'
    return 'crystal_cavern'
  }

  public getBackgroundForLevel(level: number, isBonus: boolean = false): string {
    const chapter = this.getChapterForLevel(level, isBonus)
    this.currentLevel = level
    
    if (chapter !== this.currentChapter) {
      this.currentChapter = chapter
      
      // Handle Beast Mode specially
      if (chapter === 'beast_mode') {
        return this.getBeastModeBackground(level)
      }
    }

    const chapterConfig = this.chapters.get(chapter)
    if (!chapterConfig || chapterConfig.backgrounds.length === 0) {
      return this.getFallbackBackground(level)
    }

    // Special handling for bonus levels
    if (chapter === 'bonus') {
      // Bonus levels: 10, 20, 30, 40 map to backgrounds 0-3
      // Calculate which bonus level this is (1st, 2nd, 3rd, or 4th)
      const bonusNumber = Math.floor(level / 10) - 1 // 0 for level 10, 1 for level 20, etc.
      const backgroundIndex = bonusNumber % chapterConfig.backgrounds.length
      return chapterConfig.backgrounds[backgroundIndex]
    }

    // Rotate through available backgrounds in the chapter
    const backgroundIndex = (level - chapterConfig.levelRange[0]) % chapterConfig.backgrounds.length
    return chapterConfig.backgrounds[backgroundIndex]
  }

  private getBeastModeBackground(level: number): string {
    // Rotate pool every 5 levels
    if (level % 5 === 0 && level !== this.lastBeastModeRotation) {
      this.lastBeastModeRotation = level
      this.rotateBeastModePool()
    }

    // Initialize pool if empty
    if (this.beastModePool.length === 0) {
      this.loadBeastModePool()
    }

    // Select from pool
    const poolIndex = (level - 51) % this.beastModePool.length
    return this.beastModePool[poolIndex]
  }

  private loadBeastModePool(): void {
    // Pool is now loaded progressively, this method is called after all batches are loaded
    if (this.beastModeFullyLoaded) {
      // Collect all backgrounds from all chapters including bonus
      const allBackgrounds: string[] = []
      
      this.chapters.forEach((chapter, key) => {
        if (key !== 'beast_mode') {
          allBackgrounds.push(...chapter.backgrounds)
        }
      })

      // Beast Mode uses ALL backgrounds - no subset needed
      this.beastModePool = [...allBackgrounds]
      
      // Add beast mode exclusives if they exist
      const beastModeChapter = this.chapters.get('beast_mode')
      if (beastModeChapter && beastModeChapter.backgrounds.length > 0) {
        this.beastModePool.push(...beastModeChapter.backgrounds)
      }
    }
  }
  
  private prepareBeastModeBatches(): void {
    this.loadingBatches = []
    
    // Create batches of 10 backgrounds each from remaining chapters
    const chapterOrder = ['crystal_cavern', 'volcanic_crystal', 'steampunk', 'storm', 'galactic', 'bonus']
    
    for (const chapterKey of chapterOrder) {
      const chapter = this.chapters.get(chapterKey)
      if (chapter) {
        // Split chapter backgrounds into batches of 10
        for (let i = 0; i < chapter.backgrounds.length; i += 10) {
          const batch = chapter.backgrounds.slice(i, Math.min(i + 10, chapter.backgrounds.length))
          this.loadingBatches.push(batch)
        }
      }
    }
    
    console.log(`📦 Prepared ${this.loadingBatches.length} batches for progressive loading`)
  }
  
  private startProgressiveBeastModeLoading(): void {
    if (this.loadingBatches.length === 0) {
      this.beastModeFullyLoaded = true
      console.log(`✅ Beast Mode fully loaded!`)
      this.loadBeastModePool() // Rebuild pool with all backgrounds
      return
    }
    
    // Cancel any existing timer
    if (this.progressiveLoadTimer) {
      this.progressiveLoadTimer.destroy()
    }
    
    let batchIndex = 0
    
    // Load a batch every 2 seconds
    this.progressiveLoadTimer = this.scene.time.addEvent({
      delay: 2000,
      repeat: this.loadingBatches.length - 1,
      callback: async () => {
        if (batchIndex < this.loadingBatches.length) {
          const batch = this.loadingBatches[batchIndex]
          console.log(`📥 Loading batch ${batchIndex + 1}/${this.loadingBatches.length}`)
          
          await this.loadBackgroundBatch(batch)
          
          // Add loaded backgrounds to the pool
          this.beastModePool.push(...batch)
          this.beastModeLoadingProgress += batch.length
          
          batchIndex++
          
          // Check if all batches are loaded
          if (batchIndex >= this.loadingBatches.length) {
            this.beastModeFullyLoaded = true
            console.log(`✅ Beast Mode fully loaded! Total backgrounds: ${this.beastModeLoadingProgress}`)
            this.loadBeastModePool() // Rebuild pool with all backgrounds
          }
        }
      }
    })
  }
  
  private async loadBackgroundBatch(backgroundKeys: string[]): Promise<void> {
    const loadPromises: Promise<void>[] = []
    
    for (const backgroundKey of backgroundKeys) {
      if (!this.loadedTextures.has(backgroundKey) && !this.scene.textures.exists(backgroundKey)) {
        const url = this.backgroundUrls.get(backgroundKey)
        if (url) {
          const loadPromise = new Promise<void>((resolve) => {
            this.scene.load.image(backgroundKey, url)
            this.scene.load.once('complete', () => {
              this.loadedTextures.add(backgroundKey)
              resolve()
            })
          })
          loadPromises.push(loadPromise)
        }
      }
    }
    
    if (loadPromises.length > 0) {
      this.scene.load.start()
      await Promise.all(loadPromises)
    }
  }

  private rotateBeastModePool(): void {
    // Shuffle the pool for variety
    for (let i = this.beastModePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.beastModePool[i], this.beastModePool[j]] = [this.beastModePool[j], this.beastModePool[i]]
    }
  }

  private selectRandomSubset(array: string[], count: number): string[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }

  public async loadChapterBackgrounds(chapter: string): Promise<void> {
    // Special handling for Beast Mode - progressive loading
    if (chapter === 'beast_mode') {
      console.log(`🦾 Starting progressive loading for BEAST MODE`)
      
      // Reset loading state
      this.beastModeLoadingProgress = 0
      this.beastModeFullyLoaded = false
      
      // Load initial Beast Mode exclusive backgrounds immediately
      const beastModeChapter = this.chapters.get('beast_mode')
      if (beastModeChapter) {
        await this.loadBackgroundBatch(beastModeChapter.backgrounds)
        console.log(`✅ Loaded initial ${beastModeChapter.backgrounds.length} Beast Mode exclusives`)
        
        // Initialize pool with just the exclusives first
        this.beastModePool = [...beastModeChapter.backgrounds]
        this.beastModeLoadingProgress = beastModeChapter.backgrounds.length
      }
      
      // Prepare batches for progressive loading
      this.prepareBeastModeBatches()
      
      // Start progressive loading in background
      this.startProgressiveBeastModeLoading()
      
      return
    }
    
    // Normal chapter loading
    const chapterConfig = this.chapters.get(chapter)
    if (!chapterConfig) return

    console.log(`📥 Loading backgrounds for chapter: ${chapter}`)
    const loadPromises: Promise<void>[] = []
    
    for (const backgroundKey of chapterConfig.backgrounds) {
      if (!this.loadedTextures.has(backgroundKey)) {
        // Check if texture already exists in scene
        if (!this.scene.textures.exists(backgroundKey)) {
          // Load the background on-demand
          const url = this.backgroundUrls.get(backgroundKey)
          if (url) {
            const loadPromise = new Promise<void>((resolve) => {
              this.scene.load.image(backgroundKey, url)
              this.scene.load.once('complete', () => {
                this.loadedTextures.add(backgroundKey)
                console.log(`✅ Loaded background: ${backgroundKey}`)
                resolve()
              })
            })
            loadPromises.push(loadPromise)
          }
        } else {
          this.loadedTextures.add(backgroundKey)
        }
      }
    }

    if (loadPromises.length > 0) {
      this.scene.load.start()
      await Promise.all(loadPromises)
    }
  }

  public unloadChapterBackgrounds(chapter: string): void {
    const chapterConfig = this.chapters.get(chapter)
    if (!chapterConfig) return

    // Keep a minimum cache to prevent reloading frequently used backgrounds
    if (this.loadedTextures.size <= this.MAX_CACHED_BACKGROUNDS) {
      return
    }

    chapterConfig.backgrounds.forEach(textureKey => {
      if (this.scene.textures.exists(textureKey)) {
        // Don't unload if it's currently in use
        if (textureKey !== this.getBackgroundForLevel(this.currentLevel)) {
          this.scene.textures.remove(textureKey)
          this.loadedTextures.delete(textureKey)
          this.textureCache.delete(textureKey)
        }
      }
    })
  }

  public preloadNextLevels(currentLevel: number): void {
    // Preload backgrounds for next 2 levels
    for (let i = 1; i <= this.PRELOAD_COUNT; i++) {
      const nextLevel = currentLevel + i
      const nextChapter = this.getChapterForLevel(nextLevel)
      
      // If transitioning to new chapter, start preloading it
      if (nextChapter !== this.currentChapter) {
        this.loadChapterBackgrounds(nextChapter)
        break
      }
    }
  }

  public disposeUnusedTextures(): void {
    const currentBackground = this.getBackgroundForLevel(this.currentLevel)
    const nearbyBackgrounds = new Set<string>()
    
    // Keep current and nearby level backgrounds
    for (let i = -1; i <= this.PRELOAD_COUNT; i++) {
      const level = this.currentLevel + i
      if (level > 0) {
        nearbyBackgrounds.add(this.getBackgroundForLevel(level))
      }
    }

    // Dispose textures not in use
    this.loadedTextures.forEach(textureKey => {
      if (!nearbyBackgrounds.has(textureKey) && this.loadedTextures.size > this.MAX_CACHED_BACKGROUNDS) {
        if (this.scene.textures.exists(textureKey)) {
          this.scene.textures.remove(textureKey)
          this.loadedTextures.delete(textureKey)
        }
      }
    })
  }

  public isChapterTransition(nextLevel: number, isNextLevelBonus: boolean = false): boolean {
    // Never a chapter transition if going into a bonus level
    if (isNextLevelBonus) return false
    
    // Check if we're transitioning from bonus to a new chapter
    if (this.currentChapter === 'bonus') {
      // After bonus, we go to the next chapter (e.g., after level 10 bonus -> level 11 volcanic)
      return true
    }
    
    return this.getChapterForLevel(nextLevel) !== this.currentChapter
  }

  public getChapterName(level: number, isBonus: boolean = false): string {
    const chapter = this.getChapterForLevel(level, isBonus)
    const chapterConfig = this.chapters.get(chapter)
    return chapterConfig?.name || 'Unknown'
  }
  
  public getBeastModeLoadingProgress(): { loaded: number, total: number, percentage: number } {
    const total = 70 // Approximate total backgrounds
    return {
      loaded: this.beastModeLoadingProgress,
      total,
      percentage: Math.round((this.beastModeLoadingProgress / total) * 100)
    }
  }
  
  public isBeastModeFullyLoaded(): boolean {
    return this.beastModeFullyLoaded
  }

  private getFallbackBackground(level: number): string {
    // Return the existing crystal cavern background as fallback
    return 'crystal-cavern-bg'
  }

  public generateProceduralBackground(chapter: string): string {
    // This could generate a simple gradient or pattern based on chapter theme
    // For now, return fallback
    return this.getFallbackBackground(this.currentLevel)
  }

  // Method to add background URLs when they become available
  public addBackgroundUrls(chapter: string, urls: string[]): void {
    const chapterConfig = this.chapters.get(chapter)
    if (chapterConfig) {
      chapterConfig.backgrounds = urls
    }
  }

  // Get info about current chapter for UI display
  public getCurrentChapterInfo(): { name: string, theme: string, progress: number } {
    const chapterConfig = this.chapters.get(this.currentChapter)
    if (!chapterConfig) {
      return { name: 'Unknown', theme: '', progress: 0 }
    }

    let progress = 0
    if (this.currentChapter !== 'beast_mode') {
      const [start, end] = chapterConfig.levelRange
      progress = ((this.currentLevel - start) / (end - start + 1)) * 100
    }

    return {
      name: chapterConfig.name,
      theme: chapterConfig.theme,
      progress: Math.min(100, Math.max(0, progress))
    }
  }
}