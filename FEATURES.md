# Features / Özellikler

**English** · [Türkçe](#türkçe)

Local-only password manager for Android, version 1.0.0. It needs Android 7.0 or newer. iOS is not tested.

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
- Copy a password with its copy button, or by long-pressing it in the list.
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
- The vault locks when you choose "Lock now", when the app restarts, and after leaving the app: immediately, after 1 minute or after 5 minutes.
- View and change the master password in Settings. Changing it needs the phone lock if that is on, otherwise the current password.
- After unlocking you return to where you were: the same screen, open folders, scroll position, search and half-filled forms. This lasts until Android closes the app.

### Privacy and security

- The vault is stored encrypted on the phone (SQLCipher), and nothing leaves the phone.
- Copied passwords are cleared from the clipboard after 30 seconds. If you have left the app, this happens when you return, and something else you copied is left alone. A keyboard with its own clipboard history, such as Samsung Keyboard, may keep its own copy, and the app cannot remove that.
- Screenshots and screen recording are blocked by default, and the app is blank in recent apps.
- Screenshots can be allowed in Settings. This asks for the phone lock if that is on.
- Android backup is turned off.
- Known limits and accepted risks are listed in [SECURITY.md](SECURITY.md).

### Backup and restore

- Make an encrypted backup file, locked with your current master password. This asks for the phone lock if it is on, otherwise the master password.
- Save the file to a folder you pick, starting from Documents, or send it through Android's Share menu.
- Restore a backup file with the master password used when it was made.
- Restoring adds new folders and passwords, skips what is already there and never deletes anything.
- Before restoring, the backup is shown as a folder tree, with each item marked new, already here or different.
- When a password differs between the phone and the backup, you see the current version and the backup version with their differences highlighted. You must choose one for every such password, one by one or all at once, before restoring. Showing the passwords is optional.

### Appearance and language

- English and Turkish, or follow the phone's language.
- Light and dark themes, or follow the phone's theme.
- The app remembers these settings.

### Depends on the Android version

| Feature | Android version |
| --- | --- |
| The app itself | 7.0 or newer |
| Password hidden in the system's clipboard preview | 13 or newer. Older versions get a compatibility flag where supported. |
| Message after trying to take a screenshot | Does not appear on 13 (tested). 14 or newer is possible, but untested. |
| "Follow the phone" dark theme | 10 or newer, because older versions have no system-wide dark theme |
| App icon that matches the wallpaper colours | 13 or newer |

Everything else works the same on all supported versions, as long as the phone has what the feature needs. For example, unlocking with the phone lock needs a screen lock to be set up.

## Türkçe

Yalnızca telefonda çalışan, Android için şifre yöneticisi. Sürüm 1.0.0. Android 7.0 veya üzeri gerekir. iOS'ta test edilmedi.

### Klasörler

- Şifrelerinizi klasörlerde ve iç içe klasörlerde düzenleyin.
- Klasör oluşturun, yeniden adlandırın ve silin. Klasör adları en fazla 50 karakter olabilir, aynı yerdeki iki klasör aynı adı taşıyamaz.
- Silmeden önce bir pencere klasörün içindeki her şeyi gösterir.
- Ağaçta klasörleri açıp kapatın veya "Tümünü daralt"ı kullanın.

### Şifreler

- Her biri bir klasörde olacak şekilde başlık (en fazla 100 karakter), kullanıcı adı (isteğe bağlı, en fazla 100) ve şifre (en fazla 256) kaydedin.
- Bir şifreyi açarak görüntüleyin, düzenleyin, başka klasöre taşıyın veya silin.
- Şifreler göz düğmesine dokunana kadar gizlidir.
- Şifreyi kopyalama düğmesiyle veya listede basılı tutarak kopyalayın.
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
- Kasa, "Şimdi kilitle"yi seçtiğinizde, uygulama yeniden başladığında ve uygulamadan çıktıktan sonra kilitlenir: hemen, 1 dakika sonra veya 5 dakika sonra.
- Ana şifreyi Ayarlar'dan görüntüleyin ve değiştirin. Değiştirmek için telefon kilidi açıksa o, değilse mevcut şifre gerekir.
- Kilidi açınca kaldığınız yere dönersiniz: aynı ekran, açık klasörler, kaydırma konumu, arama ve yarım kalan formlar. Bu durum Android uygulamayı kapatana kadar geçerlidir.

### Gizlilik ve güvenlik

- Kasa telefonda şifrelenmiş olarak saklanır (SQLCipher) ve hiçbir şey telefondan dışarı çıkmaz.
- Kopyalanan şifreler 30 saniye sonra panodan silinir. Uygulamadan çıktıysanız bu işlem döndüğünüzde yapılır ve kopyaladığınız başka bir şey silinmez. Samsung Klavye gibi kendi pano geçmişi olan klavyeler ayrı bir kopya tutabilir ve uygulama bunu silemez.
- Ekran görüntüsü ve ekran kaydı varsayılan olarak engellenir, uygulama son kullanılanlarda boş görünür.
- Ekran görüntüsüne Ayarlar'dan izin verilebilir. Telefon kilidi açıksa bunun için onay istenir.
- Android yedekleme kapalıdır.
- Bilinen sınırlar ve kabul edilen riskler [SECURITY.md](SECURITY.md) dosyasında (İngilizce) listelenir.

### Yedekleme ve geri yükleme

- Mevcut ana şifrenizle kilitlenen, şifrelenmiş bir yedek dosyası oluşturun. Telefon kilidi açıksa o, değilse ana şifre istenir.
- Dosyayı Belgeler'den başlayarak seçtiğiniz bir klasöre kaydedin veya Android'in Paylaş menüsüyle gönderin.
- Yedek dosyasını, oluşturulduğu sırada kullanılan ana şifreyle geri yükleyin.
- Geri yükleme yeni klasör ve şifreleri ekler, zaten mevcut olanları atlar ve hiçbir şeyi silmez.
- Geri yüklemeden önce yedek, her öğesi yeni, zaten var veya farklı olarak işaretlenmiş bir klasör ağacı olarak gösterilir.
- Bir şifre telefonda ve yedekte farklıysa mevcut sürümü ve yedekteki sürümü, farkları vurgulanmış olarak görürsünüz. Geri yüklemeden önce bu tür her şifre için tek tek veya toplu olarak bir sürüm seçmeniz gerekir. Şifreleri göstermek isteğe bağlıdır.

### Görünüm ve dil

- İngilizce ve Türkçe ya da telefonun dili.
- Açık ve koyu tema ya da telefonun teması.
- Uygulama bu ayarları hatırlar.

### Android sürümüne bağlı özellikler

| Özellik | Android sürümü |
| --- | --- |
| Uygulamanın kendisi | 7.0 veya üzeri |
| Şifrenin sistemin pano önizlemesinde gizlenmesi | 13 veya üzeri. Eski sürümlerde, desteklendiği yerde uyumluluk işareti kullanılır. |
| Ekran görüntüsü alma denemesinden sonraki mesaj | 13 sürümünde görünmez (test edildi). 14 veya üzerinde mümkün, ancak test edilmedi. |
| "Telefonu takip et" koyu tema | 10 veya üzeri, çünkü eski sürümlerde sistem genelinde koyu tema yoktur |
| Duvar kağıdı renklerine uyan uygulama simgesi | 13 veya üzeri |

Diğer her şey, telefonda gerekli donanım veya ayar olduğu sürece desteklenen tüm sürümlerde aynı çalışır. Örneğin telefon kilidiyle açmak için bir ekran kilidi kurulmuş olmalıdır.
