# Features / Özellikler

**English** · [Türkçe](#türkçe)

Local-only password manager for Android, version 1.0.3. It needs Android 7.0 or newer. iOS is not tested.

## English

### Folders

- Organise passwords in folders, with folders inside folders.
- Create, rename and delete folders. Folder names can be up to 50 characters, and two folders in the same place cannot share a name.
- Before deleting, a dialog shows everything inside the folder.
- Open and close folders in the tree, or use "Collapse all".

### Passwords

- Save a title (up to 100 characters), a username (optional, up to 100) and a password (up to 256), each inside a folder.
- Open a password to view, edit, move to another folder or delete it.
- Passwords are hidden until you tap the eye button.
- Copy a password with its copy button in the list.
- Long-press a password to start selecting, then tap more to merge or delete them together. Deleting can be undone.
- Tap Reorder on the home screen, or long-press a top-level folder, to change the order of the top-level folders, with everything closed while you do. Long-press a subfolder to change its order inside its parent folder, when that folder has more than one subfolder.
- The password itself never appears in the folder list.

### Search

- Search folders, titles and usernames from the main screen, or tap the search button to jump there.
- Results appear as the normal tree, cut down to the matches, and every action works there too.
- Search ignores case and Turkish letters, so "sifre" finds "Şifre".

### Undo

- After deleting a folder or a password, an Undo button stays for 5 seconds.

### Locking

- Create a master password on first start. Any non-empty password is accepted, and it must be typed twice.
- Unlock with the master password, or with the phone's own lock (biometrics, PIN or pattern).
- The vault locks when the app restarts, and after leaving the app: immediately, after 1 minute or after 5 minutes.
- View and change the master password from its row in Settings. Opening it asks for the phone lock if that is on, otherwise the current password.
- Other settings change without asking again once the vault is unlocked.
- After unlocking you return to where you were: the same screen, open folders, scroll position, search and half-filled forms. This lasts until Android closes the app.

### Privacy and security

- The vault is stored encrypted on the phone (SQLCipher), and nothing leaves the phone.
- Copied passwords are cleared from the clipboard after 30 seconds. If you have left the app, this happens when you return, and something else you copied is left alone. A keyboard with its own clipboard history, such as Samsung Keyboard, may keep its own copy, and the app cannot remove that.
- Screenshots and screen recording are blocked by default, and the app is blank in recent apps. While screenshots are allowed, a separate setting chooses whether the app stays hidden in recent apps.
- Screenshots can be allowed in Settings.
- Android backup is turned off.
- Known limits and accepted risks are listed in [SECURITY.md](SECURITY.md).

### Backup and restore

- Make an encrypted backup file, locked with your current master password. This asks for the phone lock if it is on, otherwise the master password.
- Save the file to a folder you pick, starting from Documents, or send it through Android's Share menu.
- Restore a backup file with the master password used when it was made.
- Restoring adds new folders and passwords, skips what is already there and never deletes anything.
- Before restoring, the backup is shown as a folder tree, with each item marked new, already here or different.
- When a password differs between the phone and the backup, you see the current version and the backup version with their differences highlighted. You must choose one for every such password, one by one or all at once, before restoring. Showing the passwords is optional.

### Autofill

Filling, the keyboard offer, shared website matching and saving are tested on a phone in several apps and browsers. Two-screen logins, the link editor and app names await a phone test.

- Turn it on from Settings, which opens Android's autofill provider screen. Once it is on, Settings shows that instead.
- On a login screen in another app or a browser, tap the offer. It appears above the keyboard if your keyboard supports that, otherwise as a small menu. It shows the password's title once a login is remembered, and on phones where Android allows it, a remembered login can open as a popup from the bottom instead.
- Every fill asks for the phone lock if it is on, otherwise the master password. The other app stays visible behind the prompt.
- The first time, pick a password from a panel at the bottom and it is remembered for that app or website, in every browser and on all parts of the same site. With one remembered password it fills straight away, and with several you choose. Your notes and folders do not change.
- After you log in by typing, Android offers to save the login. New logins go to the "Saved logins" folder, which is created when needed in the app's current language. Its name then stays as it is, and you can rename it. They are normal passwords you can edit or move. Every app and website gets its own entry, even with the same username and password as another. If the password of a remembered login changed, you are asked before it is replaced.
- On the home screen, long-press a password, choose two or more and tap Merge. You choose the title to keep, and the username and password when they differ. The merged password fills everywhere the others did, and you can undo it.
- When editing a password, "Linked apps and websites" shows where it fills. You can remove a link, type a website, or pick an installed app. Changes save straight away.
- Logins split across two screens fill one screen at a time, each with its own unlock. Their username is saved too when both screens are in the same Android activity; otherwise it is left empty. Some sites and browsers may not trigger the offer.
- Remembered links are not part of backup files yet.

### Appearance and language

- English and Turkish, or follow the phone's language.
- Light and dark themes, or follow the phone's theme.
- The app remembers these settings.
- Settings is a simple list with icons, and language, theme and auto-lock open a small choice dialog.
- Opening the app asks to install a newer version when one is published. You can say Later, and tap the app version in Settings to check and install at any time. Installing restarts the app and locks the vault.

### Depends on the Android version

| Feature | Android version |
| --- | --- |
| The app itself | 7.0 or newer |
| Password hidden in the system's clipboard preview | 13 or newer. Older versions get a compatibility flag where supported. |
| Message after trying to take a screenshot | Does not appear on 13 (tested). 14 or newer is possible, but untested. |
| Autofill in other apps and browsers | 8.0 or newer. Each app or browser must support it. Chrome needs its own setting to use another autofill service. |
| Autofill offer above the keyboard | 11 or newer, and the keyboard must support it |
| Offer to save a typed login | 9 or newer |
| Popup for a remembered login | 13 or newer, only if the phone's Android turns it on, and it can differ per app (tested: Messenger yes, Instagram no) |
| Hide in recent apps while screenshots are allowed | 13 or newer. Older versions only hide the app while screenshots are blocked. |
| "Follow the phone" dark theme | 10 or newer, because older versions have no system-wide dark theme |
| App icon that matches the wallpaper colours | 13 or newer |

Everything else works the same on all supported versions, as long as the phone has what the feature needs. For example, unlocking with the phone lock needs a screen lock to be set up.

## Türkçe

Yalnızca telefonda çalışan, Android için şifre yöneticisi. Sürüm 1.0.3. Android 7.0 veya üzeri gerekir. iOS'ta test edilmedi.

### Klasörler

- Şifrelerinizi klasörlerde ve iç içe klasörlerde düzenleyin.
- Klasör oluşturun, yeniden adlandırın ve silin. Klasör adları en fazla 50 karakter olabilir, aynı yerdeki iki klasör aynı adı taşıyamaz.
- Silmeden önce bir pencere klasörün içindeki her şeyi gösterir.
- Ağaçta klasörleri açıp kapatın veya "Tümünü daralt"ı kullanın.

### Şifreler

- Her biri bir klasörde olacak şekilde başlık (en fazla 100 karakter), kullanıcı adı (isteğe bağlı, en fazla 100) ve şifre (en fazla 256) kaydedin.
- Bir şifreyi açarak görüntüleyin, düzenleyin, başka klasöre taşıyın veya silin.
- Şifreler göz düğmesine dokunana kadar gizlidir.
- Şifreyi listedeki kopyalama düğmesiyle kopyalayın.
- Seçime başlamak için bir şifreye basılı tutun, sonra birlikte birleştirmek veya silmek için diğerlerine dokunun. Silme işlemi geri alınabilir.
- Üst düzey klasörlerin sırasını değiştirmek için ana ekranda Sırala'ya dokunun veya bir üst düzey klasöre basılı tutun; bu sırada her şey kapalı kalır. Bir alt klasöre basılı tutarak, üst klasörde birden fazla alt klasör varsa o klasör içindeki sırasını değiştirin.
- Şifrenin kendisi klasör listesinde hiçbir zaman görünmez.

### Arama

- Ana ekrandan klasörleri, başlıkları ve kullanıcı adlarını arayın ya da arama düğmesiyle doğrudan arama alanına geçin.
- Sonuçlar, eşleşmelere göre daraltılmış normal ağaç olarak görünür ve tüm işlemler burada da çalışır.
- Arama büyük/küçük harfe ve Türkçe harflere takılmaz; "sifre" yazınca "Şifre" bulunur.

### Geri alma

- Bir klasörü veya şifreyi sildikten sonra "Geri al" düğmesi 5 saniye görünür kalır.

### Kilitleme

- İlk açılışta bir ana şifre oluşturun. Boş olmayan her şifre kabul edilir ve iki kez yazılması gerekir.
- Ana şifreyle veya telefonun kendi kilidiyle (biyometri, PIN ya da desen) açın.
- Kasa, uygulama yeniden başladığında ve uygulamadan çıktıktan sonra kilitlenir: hemen, 1 dakika sonra veya 5 dakika sonra.
- Ana şifreyi Ayarlar'daki satırından görüntüleyin ve değiştirin. Açmak için telefon kilidi açıksa o, değilse mevcut şifre istenir.
- Kasa açıkken diğer ayarlar yeniden onay istemeden değiştirilir.
- Kilidi açınca kaldığınız yere dönersiniz: aynı ekran, açık klasörler, kaydırma konumu, arama ve yarım kalan formlar. Bu durum Android uygulamayı kapatana kadar geçerlidir.

### Gizlilik ve güvenlik

- Kasa telefonda şifrelenmiş olarak saklanır (SQLCipher) ve hiçbir şey telefondan dışarı çıkmaz.
- Kopyalanan şifreler 30 saniye sonra panodan silinir. Uygulamadan çıktıysanız bu işlem döndüğünüzde yapılır ve kopyaladığınız başka bir şey silinmez. Samsung Klavye gibi kendi pano geçmişi olan klavyeler ayrı bir kopya tutabilir ve uygulama bunu silemez.
- Ekran görüntüsü ve ekran kaydı varsayılan olarak engellenir, uygulama son kullanılanlarda boş görünür. Ekran görüntülerine izin verildiğinde, uygulamanın son kullanılanlarda gizli kalıp kalmayacağını ayrı bir ayar belirler.
- Ekran görüntüsüne Ayarlar'dan izin verilebilir.
- Android yedekleme kapalıdır.
- Bilinen sınırlar ve kabul edilen riskler [SECURITY.md](SECURITY.md) dosyasında (İngilizce) listelenir.

### Yedekleme ve geri yükleme

- Mevcut ana şifrenizle kilitlenen, şifrelenmiş bir yedek dosyası oluşturun. Telefon kilidi açıksa o, değilse ana şifre istenir.
- Dosyayı Belgeler'den başlayarak seçtiğiniz bir klasöre kaydedin veya Android'in Paylaş menüsüyle gönderin.
- Yedek dosyasını, oluşturulduğu sırada kullanılan ana şifreyle geri yükleyin.
- Geri yükleme yeni klasör ve şifreleri ekler, zaten mevcut olanları atlar ve hiçbir şeyi silmez.
- Geri yüklemeden önce yedek, her öğesi yeni, zaten var veya farklı olarak işaretlenmiş bir klasör ağacı olarak gösterilir.
- Bir şifre telefonda ve yedekte farklıysa mevcut sürümü ve yedekteki sürümü, farkları vurgulanmış olarak görürsünüz. Geri yüklemeden önce bu tür her şifre için tek tek veya toplu olarak bir sürüm seçmeniz gerekir. Şifreleri göstermek isteğe bağlıdır.

### Otomatik doldurma

Doldurma, klavye üstü öneri, ortak web sitesi eşleştirme ve kaydetme birçok uygulama ve tarayıcıda telefonda test edildi. İki ekranlı girişler, bağlantı düzenleyici ve uygulama adları telefonda test bekliyor.

- Ayarlar'dan açın; Android'in otomatik doldurma sağlayıcısı ekranı açılır. Açıldıktan sonra Ayarlar bunu gösterir.
- Başka bir uygulamanın veya tarayıcının giriş ekranında öneriye dokunun. Klavyeniz destekliyorsa öneri klavyenin üstünde, desteklemiyorsa küçük bir menü olarak görünür. Giriş hatırlandıktan sonra şifrenin başlığını gösterir ve Android'in izin verdiği telefonlarda hatırlanan giriş bunun yerine alttan açılan bir pencere olarak görünebilir.
- Her doldurmada telefon kilidi açıksa o, değilse ana şifre istenir. Diğer uygulama istemin arkasında görünmeye devam eder.
- İlk seferde alttan açılan panelden bir şifre seçersiniz ve o uygulama veya web sitesi için, tüm tarayıcılarda ve aynı sitenin tüm bölümlerinde hatırlanır. Hatırlanan tek şifre varsa hemen doldurulur, birkaç şifre varsa siz seçersiniz. Notlarınız ve klasörleriniz değişmez.
- Yazarak giriş yaptıktan sonra Android girişi kaydetmeyi önerir. Yeni girişler, gerektiğinde uygulamanın o anki dilinde oluşturulan "Kaydedilen girişler" klasörüne gider. Klasörün adı sonra aynı kalır ve adını değiştirebilirsiniz. Bunlar düzenleyip taşıyabileceğiniz normal şifrelerdir. Kullanıcı adı ve şifre başka bir girişle aynı olsa bile her uygulama ve web sitesinin kendi kaydı olur. Hatırlanan bir girişin şifresi değiştiyse değiştirmeden önce size sorulur.
- Ana ekranda bir şifreye basılı tutun, iki veya daha fazla şifre seçip Birleştir'e dokunun. Kalacak başlığı, farklıysa kullanıcı adını ve şifreyi siz seçersiniz. Birleştirilen şifre diğerlerinin doldurulduğu her yerde doldurulur ve işlemi geri alabilirsiniz.
- Bir şifreyi düzenlerken "Bağlı uygulamalar ve web siteleri" şifrenin nerede doldurulduğunu gösterir. Bir bağlantıyı kaldırabilir, web sitesi yazabilir veya yüklü bir uygulama seçebilirsiniz. Değişiklikler hemen kaydedilir.
- İki ekrana bölünmüş girişler her ekranda ayrı kilit açmayla, ekran ekran doldurulur. İki ekran aynı Android etkinliğindeyse kullanıcı adı da kaydedilir, değilse boş kalır. Bazı site ve tarayıcılarda öneri çıkmayabilir.
- Hatırlanan bağlantılar henüz yedek dosyalarına dahil değildir.

### Görünüm ve dil

- İngilizce ve Türkçe ya da telefonun dili.
- Açık ve koyu tema ya da telefonun teması.
- Uygulama bu ayarları hatırlar.
- Ayarlar, simgeli sade bir listedir; dil, tema ve otomatik kilit küçük bir seçim penceresi açar.
- Yeni bir sürüm yayımlandığında uygulama açılırken yüklemek isteyip istemediğinizi sorar. Sonra diyebilir, istediğiniz zaman Ayarlar'daki uygulama sürümüne dokunarak denetleyip yükleyebilirsiniz. Yüklemek uygulamayı yeniden başlatır ve kasayı kilitler.

### Android sürümüne bağlı özellikler

| Özellik | Android sürümü |
| --- | --- |
| Uygulamanın kendisi | 7.0 veya üzeri |
| Şifrenin sistemin pano önizlemesinde gizlenmesi | 13 veya üzeri. Eski sürümlerde, desteklendiği yerde uyumluluk işareti kullanılır. |
| Ekran görüntüsü alma denemesinden sonraki mesaj | 13 sürümünde görünmez (test edildi). 14 veya üzerinde mümkün, ancak test edilmedi. |
| Diğer uygulamalarda ve tarayıcılarda otomatik doldurma | 8.0 veya üzeri. Uygulamanın veya tarayıcının desteklemesi gerekir. Chrome'da başka bir otomatik doldurma hizmeti için ayrı bir ayar açılmalıdır. |
| Klavyenin üstünde otomatik doldurma önerisi | 11 veya üzeri ve klavyenin desteklemesi gerekir |
| Yazılan girişi kaydetme önerisi | 9 veya üzeri |
| Hatırlanan giriş için açılır pencere | 13 veya üzeri, yalnızca telefondaki Android bunu açtıysa ve uygulamaya göre değişebilir (test edildi: Messenger'da evet, Instagram'da hayır) |
| Ekran görüntülerine izin verilirken son kullanılanlarda gizleme | 13 veya üzeri. Eski sürümlerde uygulama yalnızca ekran görüntüleri engelliyken gizlenir. |
| "Telefonu takip et" koyu tema | 10 veya üzeri, çünkü eski sürümlerde sistem genelinde koyu tema yoktur |
| Duvar kağıdı renklerine uyan uygulama simgesi | 13 veya üzeri |

Diğer her şey, telefonda gerekli donanım veya ayar olduğu sürece desteklenen tüm sürümlerde aynı çalışır. Örneğin telefon kilidiyle açmak için bir ekran kilidi kurulmuş olmalıdır.
