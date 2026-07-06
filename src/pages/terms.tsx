import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import { ReactNode } from 'react'
import LandingLayout from 'src/@core/layouts/LandingLayout'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common']))
    }
  }
}
const Home = () => {
  const { t, i18n } = useTranslation('common')

  return (
    <>
      <section className='mt-20' style={{margin: "30px 0", }}>
        <div className='container'>
          <div className='row'>
            <div className='col-md-12 col-sm-112 mt-20 '>
              {i18n.language == 'en' ? (
                <div className='section-title text-justify'>
                  <h1 className='text-center'>Privacy Policy</h1>
                  <p className='text-center'>Last updated: May 13, 2024</p>
                  <p className='mt-3'>
                    This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of
                    Your information when You use the Service and tells You about Your privacy rights and how the law
                    protects You.
                  </p>
                  <p>
                    We use Your Personal data to provide and improve the Service. By using the Service, You agree to the
                    collection and use of information in accordance with this Privacy Policy.
                  </p>
                  <h2 className='text-center'>Interpretation and Definitions</h2>
                  <h3>Interpretation</h3>
                  <p>
                    The words of which the initial letter is capitalized have meanings defined under the following
                    conditions. The following definitions shall have the same meaning regardless of whether they appear
                    in singular or in plural.
                  </p>
                  <h3>Definitions</h3>
                  <p>For the purposes of this Privacy Policy:</p>
                  <ul>
                    <li>
                      <p>
                        <strong>Account</strong> means a unique account created for You to access our Service or parts
                        of our Service.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Affiliate</strong> means an entity that controls, is controlled by or is under common
                        control with a party, where &quot;control&quot; means ownership of 50% or more of the shares,
                        equity interest or other securities entitled to vote for election of directors or other managing
                        authority.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Application</strong> refers to ShopIA, the software program provided by the Company.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Company</strong> (referred to as either &quot;the Company&quot;, &quot;We&quot;,
                        &quot;Us&quot; or &quot;Our&quot; in this Agreement) refers to ShopIA.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Cookies</strong> are small files that are placed on Your computer, mobile device or any
                        other device by a website, containing the details of Your browsing history on that website among
                        its many uses.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Country</strong> refers to: Cameroon
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Device</strong> means any device that can access the Service such as a computer, a
                        cellphone or a digital tablet.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Personal Data</strong> is any information that relates to an identified or identifiable
                        individual.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Service</strong> refers to the Application or the Website or both.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Service Provider</strong> means any natural or legal person who processes the data on
                        behalf of the Company. It refers to third-party companies or individuals employed by the Company
                        to facilitate the Service, to provide the Service on behalf of the Company, to perform services
                        related to the Service or to assist the Company in analyzing how the Service is used.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Usage Data</strong> refers to data collected automatically, either generated by the use
                        of the Service or from the Service infrastructure itself (for example, the duration of a page
                        visit).
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Website</strong> refers to ShopIA, accessible from{' '}
                        <a href='http://www.shopia-app.com' rel='external nofollow noopener' target='_blank'>
                          http://www.shopia-app.com
                        </a>
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>You</strong> means the individual accessing or using the Service, or the company, or
                        other legal entity on behalf of which such individual is accessing or using the Service, as
                        applicable.
                      </p>
                    </li>
                  </ul>
                  <h2 className='text-center'>Collecting and Using Your Personal Data</h2>
                  <h3>Types of Data Collected</h3>
                  <h3>Personal Data</h3>
                  <p>
                    While using Our Service, We may ask You to provide Us with certain personally identifiable
                    information that can be used to contact or identify You. Personally identifiable information may
                    include, but is not limited to:
                  </p>
                  <ul>
                    <li>
                      <p>First name and last name</p>
                    </li>
                    <li>
                      <p>Phone number</p>
                    </li>
                    <li>
                      <p>Address, State, Province, ZIP/Postal code, City</p>
                    </li>
                    <li>
                      <p>Usage Data</p>
                    </li>
                  </ul>
                  <h3>Usage Data</h3>
                  <p>Usage Data is collected automatically when using the Service.</p>
                  <p>
                    Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP
                    address), browser type, browser version, the pages of our Service that You visit, the time and date
                    of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
                  </p>
                  <p>
                    When You access the Service by or through a mobile device, We may collect certain information
                    automatically, including, but not limited to, the type of mobile device You use, Your mobile device
                    unique ID, the IP address of Your mobile device, Your mobile operating system, the type of mobile
                    Internet browser You use, unique device identifiers and other diagnostic data.
                  </p>
                  <p>
                    We may also collect information that Your browser sends whenever You visit our Service or when You
                    access the Service by or through a mobile device.
                  </p>
                  <h3>Information Collected while Using the Application</h3>
                  <p>
                    While using Our Application, in order to provide features of Our Application, We may collect, with
                    Your prior permission:
                  </p>
                  <ul>
                    <li>Information regarding your location</li>
                  </ul>
                  <p>
                    We use this information to provide features of Our Service, to improve and customize Our Service.
                    The information may be uploaded to the Company's servers and/or a Service Provider's server or it
                    may be simply stored on Your device.
                  </p>
                  <p>You can enable or disable access to this information at any time, through Your Device settings.</p>
                  <h3>Tracking Technologies and Cookies</h3>
                  <p>
                    We use Cookies and similar tracking technologies to track the activity on Our Service and store
                    certain information. Tracking technologies used are beacons, tags, and scripts to collect and track
                    information and to improve and analyze Our Service. The technologies We use may include:
                  </p>
                  <ul>
                    <li>
                      <strong>Cookies or Browser Cookies.</strong> A cookie is a small file placed on Your Device. You
                      can instruct Your browser to refuse all Cookies or to indicate when a Cookie is being sent.
                      However, if You do not accept Cookies, You may not be able to use some parts of our Service.
                      Unless you have adjusted Your browser setting so that it will refuse Cookies, our Service may use
                      Cookies.
                    </li>
                    <li>
                      <strong>Web Beacons.</strong> Certain sections of our Service and our emails may contain small
                      electronic files known as web beacons (also referred to as clear gifs, pixel tags, and
                      single-pixel gifs) that permit the Company, for example, to count users who have visited those
                      pages or opened an email and for other related website statistics (for example, recording the
                      popularity of a certain section and verifying system and server integrity).
                    </li>
                  </ul>
                  <p>
                    Cookies can be &quot;Persistent&quot; or &quot;Session&quot; Cookies. Persistent Cookies remain on
                    Your personal computer or mobile device when You go offline, while Session Cookies are deleted as
                    soon as You close Your web browser. Learn more about cookies on the{' '}
                    <a
                      href='https://www.privacypolicies.com/blog/privacy-policy-template/#Use_Of_Cookies_Log_Files_And_Tracking'
                      target='_blank'
                    >
                      Privacy Policies website
                    </a>{' '}
                    article.
                  </p>
                  <p>We use both Session and Persistent Cookies for the purposes set out below:</p>
                  <ul>
                    <li>
                      <p>
                        <strong>Necessary / Essential Cookies</strong>
                      </p>
                      <p>Type: Session Cookies</p>
                      <p>Administered by: Us</p>
                      <p>
                        Purpose: These Cookies are essential to provide You with services available through the Website
                        and to enable You to use some of its features. They help to authenticate users and prevent
                        fraudulent use of user accounts. Without these Cookies, the services that You have asked for
                        cannot be provided, and We only use these Cookies to provide You with those services.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Cookies Policy / Notice Acceptance Cookies</strong>
                      </p>
                      <p>Type: Persistent Cookies</p>
                      <p>Administered by: Us</p>
                      <p>Purpose: These Cookies identify if users have accepted the use of cookies on the Website.</p>
                    </li>
                    <li>
                      <p>
                        <strong>Functionality Cookies</strong>
                      </p>
                      <p>Type: Persistent Cookies</p>
                      <p>Administered by: Us</p>
                      <p>
                        Purpose: These Cookies allow us to remember choices You make when You use the Website, such as
                        remembering your login details or language preference. The purpose of these Cookies is to
                        provide You with a more personal experience and to avoid You having to re-enter your preferences
                        every time You use the Website.
                      </p>
                    </li>
                  </ul>
                  <p>
                    For more information about the cookies we use and your choices regarding cookies, please visit our
                    Cookies Policy or the Cookies section of our Privacy Policy.
                  </p>
                  <h3>Use of Your Personal Data</h3>
                  <p>The Company may use Personal Data for the following purposes:</p>
                  <ul>
                    <li>
                      <p>
                        <strong>To provide and maintain our Service</strong>, including to monitor the usage of our
                        Service.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>To manage Your Account:</strong> to manage Your registration as a user of the Service.
                        The Personal Data You provide can give You access to different functionalities of the Service
                        that are available to You as a registered user.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>For the performance of a contract:</strong> the development, compliance and undertaking
                        of the purchase contract for the products, items or services You have purchased or of any other
                        contract with Us through the Service.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>To contact You:</strong> To contact You by email, telephone calls, SMS, or other
                        equivalent forms of electronic communication, such as a mobile application's push notifications
                        regarding updates or informative communications related to the functionalities, products or
                        contracted services, including the security updates, when necessary or reasonable for their
                        implementation.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>To provide You</strong> with news, special offers and general information about other
                        goods, services and events which we offer that are similar to those that you have already
                        purchased or enquired about unless You have opted not to receive such information.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>To manage Your requests:</strong> To attend and manage Your requests to Us.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>For business transfers:</strong> We may use Your information to evaluate or conduct a
                        merger, divestiture, restructuring, reorganization, dissolution, or other sale or transfer of
                        some or all of Our assets, whether as a going concern or as part of bankruptcy, liquidation, or
                        similar proceeding, in which Personal Data held by Us about our Service users is among the
                        assets transferred.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>For other purposes</strong>: We may use Your information for other purposes, such as
                        data analysis, identifying usage trends, determining the effectiveness of our promotional
                        campaigns and to evaluate and improve our Service, products, services, marketing and your
                        experience.
                      </p>
                    </li>
                  </ul>
                  <p>We may share Your personal information in the following situations:</p>
                  <ul>
                    <li>
                      <strong>With Service Providers:</strong> We may share Your personal information with Service
                      Providers to monitor and analyze the use of our Service, to contact You.
                    </li>
                    <li>
                      <strong>For business transfers:</strong> We may share or transfer Your personal information in
                      connection with, or during negotiations of, any merger, sale of Company assets, financing, or
                      acquisition of all or a portion of Our business to another company.
                    </li>
                    <li>
                      <strong>With Affiliates:</strong> We may share Your information with Our affiliates, in which case
                      we will require those affiliates to honor this Privacy Policy. Affiliates include Our parent
                      company and any other subsidiaries, joint venture partners or other companies that We control or
                      that are under common control with Us.
                    </li>
                    <li>
                      <strong>With business partners:</strong> We may share Your information with Our business partners
                      to offer You certain products, services or promotions.
                    </li>
                    <li>
                      <strong>With other users:</strong> when You share personal information or otherwise interact in
                      the public areas with other users, such information may be viewed by all users and may be publicly
                      distributed outside.
                    </li>
                    <li>
                      <strong>With Your consent</strong>: We may disclose Your personal information for any other
                      purpose with Your consent.
                    </li>
                  </ul>
                  <h3>Retention of Your Personal Data</h3>
                  <p>
                    The Company will retain Your Personal Data only for as long as is necessary for the purposes set out
                    in this Privacy Policy. We will retain and use Your Personal Data to the extent necessary to comply
                    with our legal obligations (for example, if we are required to retain your data to comply with
                    applicable laws), resolve disputes, and enforce our legal agreements and policies.
                  </p>
                  <p>
                    The Company will also retain Usage Data for internal analysis purposes. Usage Data is generally
                    retained for a shorter period of time, except when this data is used to strengthen the security or
                    to improve the functionality of Our Service, or We are legally obligated to retain this data for
                    longer time periods.
                  </p>
                  <h3>Transfer of Your Personal Data</h3>
                  <p>
                    Your information, including Personal Data, is processed at the Company's operating offices and in
                    any other places where the parties involved in the processing are located. It means that this
                    information may be transferred to — and maintained on — computers located outside of Your state,
                    province, country or other governmental jurisdiction where the data protection laws may differ than
                    those from Your jurisdiction.
                  </p>
                  <p>
                    Your consent to this Privacy Policy followed by Your submission of such information represents Your
                    agreement to that transfer.
                  </p>
                  <p>
                    The Company will take all steps reasonably necessary to ensure that Your data is treated securely
                    and in accordance with this Privacy Policy and no transfer of Your Personal Data will take place to
                    an organization or a country unless there are adequate controls in place including the security of
                    Your data and other personal information.
                  </p>
                  <h3>Delete Your Personal Data</h3>
                  <p>
                    You have the right to delete or request that We assist in deleting the Personal Data that We have
                    collected about You.
                  </p>
                  <p>
                    Our Service may give You the ability to delete certain information about You from within the
                    Service.
                  </p>
                  <p>
                    You may update, amend, or delete Your information at any time by signing in to Your Account, if you
                    have one, and visiting the account settings section that allows you to manage Your personal
                    information. You may also contact Us to request access to, correct, or delete any personal
                    information that You have provided to Us.
                  </p>
                  <p>
                    Please note, however, that We may need to retain certain information when we have a legal obligation
                    or lawful basis to do so.
                  </p>
                  <h3>Disclosure of Your Personal Data</h3>
                  <h3>Business Transactions</h3>
                  <p>
                    If the Company is involved in a merger, acquisition or asset sale, Your Personal Data may be
                    transferred. We will provide notice before Your Personal Data is transferred and becomes subject to
                    a different Privacy Policy.
                  </p>
                  <h3>Law enforcement</h3>
                  <p>
                    Under certain circumstances, the Company may be required to disclose Your Personal Data if required
                    to do so by law or in response to valid requests by public authorities (e.g. a court or a government
                    agency).
                  </p>
                  <h3>Other legal requirements</h3>
                  <p>
                    The Company may disclose Your Personal Data in the good faith belief that such action is necessary
                    to:
                  </p>
                  <ul>
                    <li>Comply with a legal obligation</li>
                    <li>Protect and defend the rights or property of the Company</li>
                    <li>Prevent or investigate possible wrongdoing in connection with the Service</li>
                    <li>Protect the personal safety of Users of the Service or the public</li>
                    <li>Protect against legal liability</li>
                  </ul>
                  <h3>Security of Your Personal Data</h3>
                  <p>
                    The security of Your Personal Data is important to Us, but remember that no method of transmission
                    over the Internet, or method of electronic storage is 100% secure. While We strive to use
                    commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute
                    security.
                  </p>
                  <h2 className='text-center'>Children's Privacy</h2>
                  <p>
                    Our Service does not address anyone under the age of 13. We do not knowingly collect personally
                    identifiable information from anyone under the age of 13. If You are a parent or guardian and You
                    are aware that Your child has provided Us with Personal Data, please contact Us. If We become aware
                    that We have collected Personal Data from anyone under the age of 13 without verification of
                    parental consent, We take steps to remove that information from Our servers.
                  </p>
                  <p>
                    If We need to rely on consent as a legal basis for processing Your information and Your country
                    requires consent from a parent, We may require Your parent's consent before We collect and use that
                    information.
                  </p>
                  <h2 className='text-center'>Links to Other Websites</h2>
                  <p>
                    Our Service may contain links to other websites that are not operated by Us. If You click on a third
                    party link, You will be directed to that third party's site. We strongly advise You to review the
                    Privacy Policy of every site You visit.
                  </p>
                  <p>
                    We have no control over and assume no responsibility for the content, privacy policies or practices
                    of any third party sites or services.
                  </p>
                  <h2 className='text-center'>Changes to this Privacy Policy</h2>
                  <p>
                    We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the
                    new Privacy Policy on this page.
                  </p>
                  <p>
                    We will let You know via email and/or a prominent notice on Our Service, prior to the change
                    becoming effective and update the &quot;Last updated&quot; date at the top of this Privacy Policy.
                  </p>
                  <p>
                    You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy
                    Policy are effective when they are posted on this page.
                  </p>
                  <h2 className='text-center'>Contact Us</h2>
                  <p>If you have any questions about this Privacy Policy, You can contact us:</p>
                  <ul>
                    <li>By email: support@shopia-app.com</li>
                  </ul>
                </div>
              ) : (
                <div className='section-title text-justify'>
                  <h1 className='text-center'>Politique de confidentialité</h1>
                  <p className='text-center'>Dernière mise à jour : 13 Mai 2024</p>
                  <p className='mt-3'>
                    La présente politique de confidentialité décrit nos politiques et procédures concernant la collecte,
                    l'utilisation et la divulgation de vos informations lorsque lorsque vous utilisez le service et vous
                    informe de vos droits en matière de protection de la vie privée et comment la loi vous protège.
                  </p>
                  <p>
                    Nous utilisons vos données personnelles pour fournir et améliorer le Service. En utilisant le
                    Service, vous acceptez la collecte et l'utilisation d'informations conformément à la présente
                    politique de confidentialité. informations conformément à la présente politique de confidentialité.
                  </p>
                  <h2 className='text-center'>Interprétation et définitions</h2>
                  <h3>Interprétation</h3>
                  <p>
                    Les mots dont la lettre initiale est en majuscule ont une ont des significations définies dans les
                    conditions suivantes. Les définitions suivantes définitions suivantes ont la même signification,
                    qu'elles apparaissent qu'elles apparaissent au singulier ou au pluriel.
                  </p>
                  <h3>Definitions</h3>
                  <p>Aux fins de la présente politique de protection de la vie privée, on entend par</p>
                  <ul>
                    <li>
                      <p>
                        <strong>Compte</strong> désigne un compte unique créé pour vous afin d'accéder à notre service
                        ou à certaines de ses parties. pour vous permettre d'accéder à notre service ou à des parties de
                        notre service.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Affilié</strong> : une entité qui contrôle, est contrôlée par une partie ou est sous
                        contrôle commun avec elle, où l'on entend par "contrôle" la propriété de 50 % ou plus des
                        actions, participations ou autres titres ou d'autres titres donnant droit à un vote pour
                        l'élection des l'autorité de gestion.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>L'application</strong> fait référence à ShopIA, le logiciel logiciel fourni par la
                        société.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Compagnie</strong> (dénommée soit &quot;la société&quot ;, &quot;Nous&quot ;,
                        &quot;Nous&quot ; ou &quot;Our&quot ; dans le présent accord) se réfère à ShopIA.
                      </p>
                    </li>
                    <li>
                      <p>
                        Les <strong>Cookies</strong> sont de petits fichiers qui sont placés sur votre ordinateur, votre
                        appareil mobile ou tout autre appareil par un site web, contenant les détails de votre
                        historique de navigation sur ce site web, parmi ses nombreuses utilisations.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Le pays</strong> se réfère à : Cameroun
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Appareil</strong> désigne tout appareil pouvant accéder au service, tel qu'un
                        ordinateur, un téléphone portable ou un appareil numérique. tel qu'un ordinateur, un téléphone
                        portable ou une tablette numérique. tablette numérique.
                      </p>
                    </li>
                    <li>
                      <p>
                        Les <strong>données personnelles</strong> sont toutes les informations qui se rapporte à une
                        personne identifiée ou identifiable.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Le service</strong> fait référence à l'application ou au site web ou les deux.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Fournisseur de services</strong> : toute personne physique ou morale qui traite les
                        données pour le compte de l'autorité compétente. personne physique ou morale qui traite les
                        données pour le compte de la l'entreprise. Il s'agit de sociétés tierces ou d'individus employés
                        par l'entreprise pour faciliter le service, pour fournir le service au nom de l'entreprise, pour
                        exécuter les tâches de l'entreprise. provide the Service on behalf of the Company, to perform
                        services related to the Service or to assist the Company à analyser l'utilisation du service.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Les données d'utilisation</strong> font référence aux données collectées
                        automatiquement, soit générées par l'utilisation du service ou provenant de l'infrastructure du
                        service elle-même (par exemple, la durée de la visite d'une page), la durée de la visite d'une
                        page).
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Le site web</strong> fait référence à ShopIA, accessible à partir de{''}
                        <a href='http://www.shopia-app.com' rel='external nofollow noopener' target='_blank'>
                          http://www.shopia-app.com
                        </a>
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Vous</strong> désigne la personne qui accède ou utilisant le service, ou la société ou
                        toute autre entité juridique pour le compte de laquelle cette personne accède au service ou
                        l'utilise, selon le cas. le service, selon le cas.
                      </p>
                    </li>
                  </ul>
                  <h2 className='text-center'>Collecte et utilisation de vos données personnelles</h2>
                  <h3>Types de données collectées</h3>
                  <h3>Données personnelles</h3>
                  <p>
                    While using Our Service, We may ask You to provide Us with certain personally identifiable
                    information that can be used to contact or identify You. Personally identifiable information may
                    include, but is not limited to:
                  </p>
                  <ul>
                    <li>
                      <p>Prénom et nom de famille</p>
                    </li>
                    <li>
                      <p>Numéro de téléphone</p>
                    </li>
                    <li>
                      <p>Adresse, État, Province, Code postal, Ville</p>
                    </li>
                    <li>
                      <p>Données d'utilisation</p>
                    </li>
                  </ul>
                  <h3>Données d'utilisation</h3>
                  <p>Les données d'utilisation sont collectées automatiquement lors de l'utilisation du service.</p>
                  <p>
                    Les Données d'utilisation peuvent inclure des informations telles que l'adresse de votre appareil
                    l'adresse du protocole Internet (par exemple, l'adresse IP), le type de navigateur, version du
                    navigateur, les pages de notre Service que vous visitez, l'heure et la date de votre visite, la
                    durée de votre visite, la durée de votre visite et la durée de votre visite. l'heure et la date de
                    votre visite, le temps passé sur ces pages, les identifiants uniques de l'appareil et d'autres
                    données de diagnostic.
                  </p>
                  <p>
                    Lorsque Vous accédez au Service par ou via un appareil mobile, Nous pouvons collecter certaines
                    informations automatiquement, y compris, mais le type d'appareil mobile que vous utilisez,
                    l'identifiant unique de votre l'adresse IP de votre appareil mobile, votre système d'exploitation
                    mobile, le système d'exploitation mobile, le type de navigateur Internet mobile Vous utilisez, les
                    identifiants uniques de l'appareil et d'autres données de diagnostic.
                  </p>
                  <p>
                    Nous pouvons également collecter des informations que votre navigateur envoie chaque fois que vous
                    visitez notre service ou que vous accédez au service par ou via un appareil mobile.
                  </p>
                  <h3>Informations collectées lors de l'utilisation de l'application</h3>
                  <p>
                    Lors de l'utilisation de notre application, afin de fournir des fonctionnalités de. Notre
                    Application, Nous pouvons collecter, avec Votre autorisation préalable :
                  </p>
                  <ul>
                    <li>Informations sur votre lieu de résidence</li>
                  </ul>
                  <p>
                    Nous utilisons ces informations pour fournir des fonctionnalités de notre service, pour améliorer et
                    personnaliser notre service. Les informations peuvent être être téléchargées sur les serveurs de la
                    Société et/ou sur le serveur d'un d'un fournisseur de services ou être simplement stockées sur votre
                    appareil.
                  </p>
                  <p>
                    Vous pouvez activer ou désactiver l'accès à ces informations à tout moment, via les paramètres de
                    votre appareil. l'accès à ces informations à tout moment, via les paramètres de votre appareil.
                  </p>
                  <h3>Technologies de suivi et cookies</h3>
                  <p>
                    Nous utilisons des cookies et des technologies de suivi similaires pour suivre l'activité sur notre
                    service et stocker certaines informations. pour suivre l'activité sur notre service et stocker
                    certaines informations. Les technologies de suivi utilisées sont des balises, des tags et des
                    scripts pour pour collecter et suivre les informations et pour améliorer et analyser notre service.
                    Les technologies que nous utilisons peuvent inclure :
                  </p>
                  <ul>
                    <li>
                      <strong>Cookies ou cookies de navigateur.</strong> Un cookie est un petit fichier placé sur votre
                      petit fichier placé sur votre appareil. Vous pouvez demander à votre navigateur de refuser tous
                      les cookies ou de signaler l'envoi d'un cookie. est envoyé. However, if You do not accept Cookies,
                      You may not be able to use some parts of our Service. Unless you have adjusted Your browser
                      setting so that it will refuse Cookies, our Service may use Cookies.
                    </li>
                    <li>
                      <strong>Balises Web.</strong> Certaines sections de notre service et nos courriels peuvent
                      contenir de petits fichiers électroniques connus sous le nom de balises web (également appelés
                      pixels invisibles, pixel pixel tags, et single-pixel gifs) qui permettent à l'entreprise, par
                      exemple de compter les utilisateurs qui ont visité ces pages ou ouvert un ouvert un courrier
                      électronique et d'autres statistiques liées au site web (par exemple, l'enregistrement de la
                      popularité du site). (par exemple, enregistrer la popularité d'une certaine section et de vérifier
                      l'intégrité du système et du serveur).
                    </li>
                  </ul>
                  <p>
                    Les cookies peuvent être "persistants" ou "de session" ; Cookies. Les cookies persistants restent
                    sur votre ordinateur ou mobile lorsque vous êtes hors ligne, tandis que les cookies de session sont
                    supprimés dès que vous fermez votre navigateur web.
                  </p>
                  <p>
                    Nous utilisons des cookies de session et des cookies persistants aux fins suivantes énoncées
                    ci-dessous :
                  </p>
                  <ul>
                    <li>
                      <p>
                        <strong>Cookies nécessaires / essentiels</strong>
                      </p>
                      <p>Type : Cookies de session</p>
                      <p>Administré par : Nous</p>
                      <p>
                        Objectif : Ces cookies sont essentiels pour vous fournir les services disponibles sur le site
                        Web et pour vous permettre de les utiliser. services disponibles sur le site Web et vous
                        permettre d'utiliser d'utiliser certaines de ses fonctionnalités. Ils permettent d'authentifier
                        utilisateurs et à prévenir l'utilisation frauduleuse des comptes d'utilisateurs. En l'absence de
                        sans ces cookies, les services que vous avez demandés ne peuvent pas être fournis. demandés ne
                        peuvent être fournis, et Nous n'utilisons ces Cookies que pour vous ces services.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Politique en matière de cookies / Avis Acceptation des cookies</strong>
                      </p>
                      <p>Type : Cookies persistants</p>
                      <p>Administré par : Nous</p>
                      <p>
                        Objectif : Ces cookies permettent de savoir si les utilisateurs ont accepté l'utilisation de
                        l'utilisation de cookies sur le site web.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Cookies de fonctionnalité</strong>
                      </p>
                      <p>Type : Cookies persistants</p>
                      <p>Administré par : Nous</p>
                      <p>
                        Objectif : Ces cookies nous permettent de mémoriser les choix que vous faites choix que vous
                        faites lorsque vous utilisez le site Web, par exemple en mémorisant vos de connexion ou de votre
                        choix de langue. L'objectif de ces cookies est de vous offrir une expérience plus personnelle et
                        de vous éviter d'avoir à réintroduire vos préférences à chaque fois. et de vous éviter d'avoir à
                        réintroduire vos préférences chaque fois que vous utilisez le site Web. chaque fois que vous
                        utilisez le site web.
                      </p>
                    </li>
                  </ul>
                  <p>
                    Pour plus d'informations sur les cookies que nous utilisons et les choix qui s'offrent à vous
                    concernant les cookies, veuillez consulter notre Politique en matière de cookies ou la section
                    Cookies de notre Politique de confidentialité. section Cookies de notre politique de
                    confidentialité.
                  </p>
                  <h3>Utilisation de vos données personnelles</h3>
                  <p>La société peut utiliser les données personnelles aux fins suivantes :</p>
                  <ul>
                    <li>
                      <p>
                        <strong>Fournir et maintenir notre service</strong>, y compris pour contrôler l'utilisation de
                        notre service.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Pour gérer votre compte :</strong> pour gérer votre enregistrement en tant
                        qu'utilisateur du service. Les données personnelles que vous fournissez peuvent vous donner
                        accès à différentes fonctionnalités du Service qui vous sont accessibles en tant qu'utilisateur
                        en tant qu'utilisateur enregistré.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Pour l'exécution d'un contrat :</strong> l'élaboration, la mise en conformité et
                        l'engagement de l'achat l'élaboration, le respect et l'exécution du contrat d'achat d'achat des
                        produits, articles ou services que Vous avez acheté ou de tout autre contrat conclu avec Nous
                        par l'intermédiaire du service.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Pour vous contacter :</strong> Vous contacter par courrier électronique, appels
                        téléphoniques, SMS, ou autres formes équivalentes de communication électronique, telles que les
                        notifications push d'une application mobile d'une application mobile concernant des mises à jour
                        ou des d'information relatives aux fonctionnalités, aux produits ou aux services contractuels, y
                        compris les mises à jour de sécurité, lorsque nécessaires ou raisonnables pour leur mise en
                        œuvre.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Pour vous fournir</strong> avec des nouvelles, des offres spéciales et des informations
                        générales sur d'autres biens, services et événements que nous proposons et qui sont similaires à
                        ceux que vous avez que vous avez déjà achetés ou pour lesquels vous vous êtes renseigné, à moins
                        que vous n'ayez choisi de ne pas recevoir ces informations. que vous ayez choisi de ne pas
                        recevoir ces informations.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Pour gérer vos demandes :</strong> Pour répondre à vos demandes et gérer les demandes
                        que vous nous adressez.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>Pour les transferts d'entreprise:</strong> Nous pouvons utiliser vos informations pour
                        évaluer ou conduire une fusion, une cession, restructuration, réorganisation, dissolution ou
                        autre vente ou transfert ou le transfert d'une partie ou de la totalité de nos actifs, qu'il
                        s'agisse d'une ou dans le cadre d'une faillite, d'une liquidation ou d'une procédure similaire,
                        dans laquelle les données personnelles que nous détenons concernant les utilisateurs de nos
                        services font partie des actifs transférés.
                      </p>
                    </li>
                    <li>
                      <p>
                        <strong>À d'autres fins</strong>: Nous pouvons utiliser vos informations à d'autres fins, telles
                        que l'analyse des données, l'identification des tendances d'utilisation, la détermination de
                        l'efficacité nos campagnes promotionnelles et pour évaluer et améliorer nos service, nos
                        produits, nos services, notre marketing et votre expérience.
                      </p>
                    </li>
                  </ul>
                  <p>
                    Nous pouvons partager vos informations personnelles dans les cas suivants situations suivantes :
                  </p>
                  <ul>
                    <li>
                      <strong>Avec les prestataires de services:</strong> Nous pouvons partager vos informations
                      personnelles avec des fournisseurs de services pour d'analyser l'utilisation de notre service, de
                      vous contacter.
                    </li>
                    <li>
                      <strong>Pour les transferts d'entreprise :</strong> Nous pouvons partager ou transférer vos
                      informations personnelles dans le cadre de, ou pendant les négociations relatives à toute fusion,
                      vente d'actifs de la société, financement ou acquisition de tout ou partie de notre société,
                      financement, ou l'acquisition de tout ou partie de nos entreprise à une autre société.
                    </li>
                    <li>
                      <strong>Avec les affiliés:</strong> Nous pouvons partager vos informations avec nos sociétés
                      affiliées, auquel cas nous dans ce cas, nous exigerons de ces affiliés qu'ils respectent cette
                      politique de confidentialité. Les sociétés affiliées comprennent notre société mère et toute autre
                      filiales, partenaires de coentreprise ou autres sociétés que nous contrôlons ou qui sont sous
                      contrôle commun avec nous. que nous contrôlons ou qui sont sous contrôle commun avec nous.
                    </li>
                    <li>
                      <strong>Avec d'autres utilisateurs:</strong> when you share information personal information or
                      otherwise interact with other users, this information can be seen by all users other users, this
                      information may be seen by all users and may be and may be publicly disclosed to others.
                    </li>
                    <li>
                      <strong>Avec votre consentement</strong>: Nous pouvons divulguer vos à toute autre fin avec votre
                      consentement. consentement.
                    </li>
                  </ul>
                  <h3>Conservation de vos données personnelles</h3>
                  <p>
                    La société ne conservera vos données à caractère personnel que pendant la durée nécessaire aux fins
                    énoncées dans la présente politique de confidentialité. nécessaire aux fins énoncées dans la
                    présente politique de confidentialité. Nous conserverons et utiliserons vos données personnelles
                    dans la mesure où nécessaires pour nous conformer à nos obligations légales (par exemple, si nous
                    sommes tenus de conserver vos données pour nous conformer aux pour nous conformer aux lois
                    applicables), résoudre les litiges et appliquer nos juridiques et politiques.
                  </p>
                  <p>
                    La société conservera également les données d'utilisation à des fins d'analyse interne. à des fins
                    d'analyse interne. Les données d'utilisation sont généralement conservées pour une période de temps
                    plus courte, sauf lorsque ces données sont utilisées pour renforcer la sécurité ou pour améliorer la
                    fonctionnalité de notre service, de nos services ou de nos produits. renforcer la sécurité ou
                    améliorer la fonctionnalité de notre service, ou lorsque nous sommes légalement tenus de conserver
                    ces données plus longtemps. période de temps plus longue.
                  </p>
                  <h3>Transfert de vos données personnelles</h3>
                  <p>
                    Vos informations, y compris les données à caractère personnel, sont traitées dans les bureaux de
                    l'entreprise et dans tout autre lieu où l'entreprise est présente. dans les bureaux de l'entreprise
                    et dans tout autre lieu où se trouvent les parties impliquées dans le traitement sont situées. Cela
                    signifie que ces informations peuvent être transférées vers - et conservées sur - des des
                    ordinateurs situés en dehors de votre État, province, pays ou autre juridiction gouvernementale où
                    les lois sur la protection des données peuvent différer de celles de votre juridiction.
                  </p>
                  <p>
                    Votre consentement à la présente politique de protection de la vie privée soumission de ces
                    informations représente votre accord à ce transfert. ce transfert.
                  </p>
                  <p>
                    L'entreprise prendra toutes les mesures raisonnablement nécessaires pour garantir que vos données
                    soient traitées en toute sécurité et conformément à la présente politique de confidentialité. et
                    aucun transfert de vos données personnelles n'aura lieu vers une organisation ou un pays vers une
                    organisation ou un pays à moins qu'il n'y ait des contrôles des contrôles adéquats sont en place, y
                    compris la sécurité de vos données et autres informations personnelles.
                  </p>
                  <h3>Supprimer vos données personnelles</h3>
                  <p>
                    Vous avez le droit de supprimer ou de nous demander de vous aider à supprimer les données à
                    caractère personnel que nous avons collectées à votre sujet.
                  </p>
                  <p>
                    Notre Service peut vous donner la possibilité de supprimer certaines informations vous concernant à
                    partir du service.
                  </p>
                  <p>
                    Vous pouvez mettre à jour, modifier ou supprimer vos informations à tout moment en vous connectant à
                    votre compte, si vous en avez un, et en visitant la section la section des paramètres du compte qui
                    vous permet de gérer vos informations personnelles. Vous pouvez également nous contacter pour
                    demander l'accès, la correction ou la suppression de toute information que vous nous avez fournies.
                  </p>
                  <p>
                    Veuillez noter, cependant, que nous pouvons être amenés à conserver certaines certaines informations
                    lorsque nous avons une obligation légale ou une base de le faire.
                  </p>
                  <h3>Divulgation de vos données personnelles</h3> <h3>Transactions commerciales</h3>{' '}
                  <h3>Travail en ligne</h3>
                  <h3>Transactions commerciales</h3>
                  <p>
                    Si la Société est impliquée dans une fusion, une acquisition ou une vente d'actifs, Vos données
                    personnelles peuvent être transférées. d'actifs, vos données personnelles peuvent être transférées.
                    Nous fournirons une notification avant que vos données personnelles ne soient transférées et
                    soumises à une autre politique de protection de la vie privée. et qu'elles soient soumises à une
                    politique de confidentialité différente.
                  </p>
                  <h3>L'application de la loi</h3>
                  <p>
                    Dans certaines circonstances, l'entreprise peut être tenue de divulguer vos données personnelles si
                    la loi l'exige ou en réponse à une en réponse à des demandes valables émanant d'autorités publiques
                    (par ex. un tribunal un tribunal ou une agence gouvernementale).
                  </p>
                  <h3>Autres obligations légales</h3>
                  <p>
                    La société peut divulguer vos données personnelles en croyant de bonne foi qu'une telle action est
                    nécessaire pour foi qu'une telle action est nécessaire pour :
                  </p>
                  <ul>
                    <li>Se conformer à une obligation légale</li>
                    <li>Protéger et défendre les droits ou les biens de l'entreprise</li>
                    <li>Prévenir ou enquêter sur d'éventuels actes répréhensibles en rapport avec le service</li>
                    <li>protéger la sécurité personnelle des utilisateurs du service ou du public public</li>
                    <li>Protéger contre la responsabilité juridique</li>
                  </ul>
                  <h3>Sécurité de vos données à caractère personnel</h3>
                  <p>
                    La sécurité de vos données personnelles est importante pour nous. mais rappelez-vous qu'aucune
                    méthode de transmission sur Internet, ou méthode de stockage électronique n'est sûre à 100 %. Bien
                    que nous nous efforcions Nous nous efforçons d'utiliser des moyens commercialement acceptables pour
                    protéger vos données personnelles, mais nous ne pouvons pas garantir leur sécurité absolue.
                    personnelles, nous ne pouvons pas garantir leur sécurité absolue.
                  </p>
                  <h2 className='text-center'>Le respect de la vie privée des enfants</h2>
                  <p>
                    Notre service ne s'adresse pas aux personnes âgées de moins de 13 ans. Nous ne collectons Nous ne
                    recueillons pas sciemment d'informations personnellement identifiables auprès de personnes âgées de
                    moins de 13 ans. Si vous êtes un parent ou un tuteur et que vous savez que votre enfant a moins de
                    13 ans, nous ne collectons pas sciemment d'informations personnelles identifiables auprès de ces
                    personnes. et que vous savez que votre enfant nous a fourni des données personnelles, veuillez nous
                    contacter. données personnelles, veuillez nous contacter. Si nous apprenons que nous avons recueilli
                    des données personnelles auprès d'une personne âgée de moins de 13 ans sans vérification du
                    consentement parental, nous prenons des mesures pour Nous prenons des mesures pour supprimer ces
                    informations de nos serveurs.
                  </p>
                  <p>
                    Si nous devons nous appuyer sur le consentement comme base juridique du traitement vos informations
                    et que votre pays exige le consentement d'un parent, nous pouvons exiger le consentement de votre
                    parent avant de collecter avant de collecter et d'utiliser ces informations.
                  </p>
                  <h2 className='text-center'>Liens vers d'autres sites web</h2>
                  <p>
                    Notre Service peut contenir des liens vers d'autres sites Web qui ne sont pas exploités par Nous.
                    exploités par nous. Si vous cliquez sur le lien d'un tiers, vous serez dirigé vers le site de ce
                    tiers. serez dirigé vers le site de cette tierce partie. Nous vous conseillons vivement de consulter
                    la politique de confidentialité de chaque site que vous visitez.
                  </p>
                  <p>
                    Nous n'avons aucun contrôle et n'assumons aucune responsabilité pour le contenu, les politiques de
                    confidentialité ou les pratiques des tiers. contenu, les politiques de confidentialité ou les
                    pratiques de tout tiers.
                  </p>
                  <h2 className='text-center'>Modifications de cette politique de confidentialité</h2>
                  <p>
                    Nous pouvons mettre à jour notre politique de confidentialité de temps à autre. Nous vous
                    notifierons toute modification en publiant la nouvelle politique de confidentialité sur cette page.
                    cette page.
                  </p>
                  <p>
                    Nous vous informerons par courrier électronique et/ou par un avis bien visible sur notre service,
                    avant que la modification n'entre en vigueur. notre service, avant que la modification n'entre en
                    vigueur et nous mettrons à jour la date de la date de " dernière mise à jour " en haut de la
                    présente politique de confidentialité. Privacy Policy.
                  </p>
                  <p>
                    Nous vous conseillons de consulter régulièrement la présente politique de confidentialité afin de
                    prendre connaissance de toute modification. pour vérifier s'il y a des changements. Les
                    modifications apportées à la présente politique de confidentialité entrent en vigueur lorsqu'elles
                    sont publiées sur cette page. de leur publication sur cette page.
                  </p>
                  <h2 className='text-center'>Contactez-nous</h2>
                  <p>
                    Si vous avez des questions concernant la présente politique de confidentialité, vous pouvez nous
                    contacter :
                  </p>
                  <ul>
                    <li>Par courrier électronique : support@shopia-app.com</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

Home.getLayout = (page: ReactNode) => <LandingLayout>{page}</LandingLayout>
Home.defaultProps = { isHome: true }
export default Home
