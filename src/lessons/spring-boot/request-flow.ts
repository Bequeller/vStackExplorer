import type { Lesson, Source } from '../types';

// Every URL is pinned to the release tag, so line anchors stay valid.
const SF = 'https://github.com/spring-projects/spring-framework/blob/v7.0.10';
const SB = 'https://github.com/spring-projects/spring-boot/blob/v4.1.2';
const TC = 'https://github.com/apache/tomcat/blob/11.0.27';
const SF_V = 'Spring Framework 7.0.10';
const SB_V = 'Spring Boot 4.1.2';
const TC_V = 'Apache Tomcat 11.0.27';

const WEBMVC = `${SF}/spring-webmvc/src/main/java/org/springframework/web/servlet`;
const SF_DOCS = `${SF}/framework-docs/modules/ROOT/pages/web/webmvc`;

const src = {
  dispatcherDocs: { label: 'Reference: DispatcherServlet Processing (sequence.adoc)', url: `${SF_DOCS}/mvc-servlet/sequence.adoc`, version: SF_V },
  specialBeans: { label: 'Reference: Special Bean Types (special-bean-types.adoc)', url: `${SF_DOCS}/mvc-servlet/special-bean-types.adoc`, version: SF_V },
  interceptorDocs: { label: 'Reference: Interception (handlermapping-interceptor.adoc)', url: `${SF_DOCS}/mvc-servlet/handlermapping-interceptor.adoc`, version: SF_V },
  requestBodyDocs: { label: 'Reference: @RequestBody (requestbody.adoc)', url: `${SF_DOCS}/mvc-controller/ann-methods/requestbody.adoc`, version: SF_V },
  responseBodyDocs: { label: 'Reference: @ResponseBody (responsebody.adoc)', url: `${SF_DOCS}/mvc-controller/ann-methods/responsebody.adoc`, version: SF_V },
  bootFilterDocs: {
    label: 'Boot reference: Registering Servlets, Filters, and Listeners as Spring Beans (servlet.adoc)',
    url: `${SB}/documentation/spring-boot-docs/src/docs/antora/modules/reference/pages/web/servlet.adoc#L556-L578`,
    version: SB_V,
  },
  doDispatch: { label: 'DispatcherServlet.doDispatch()', url: `${WEBMVC}/DispatcherServlet.java#L935-L990`, version: SF_V },
} satisfies Record<string, Source>;

export const lesson: Lesson = {
  id: 'request-flow',
  topic: 'spring-boot',
  title: 'HTTP 요청 한 건이 Spring MVC를 지나가는 길',
  summary:
    '`POST /api/orders` 요청 하나를 Tomcat worker thread → Filter chain → `DispatcherServlet` → `HandlerMapping` → `HandlerAdapter` → argument resolver와 message converter → controller → return value 처리 → 응답까지 따라갑니다.',
  versions: {
    'Spring Boot': '4.1.2',
    'Spring Framework': '7.0.10',
    'Apache Tomcat': '11.0.27',
  },
  scene: { width: 1000, height: 640 },
  nodes: [
    { id: 'client', label: 'Client', sublabel: 'HTTP/1.1', kind: 'client', x: 100, y: 60 },
    { id: 'tomcat', label: 'Tomcat', sublabel: 'Http11NioProtocol', kind: 'container', x: 330, y: 60 },
    { id: 'filters', label: 'Filter chain', sublabel: 'ApplicationFilterChain', kind: 'container', x: 580, y: 60 },
    { id: 'dispatcher', label: 'DispatcherServlet', sublabel: 'doDispatch()', kind: 'framework', x: 850, y: 60 },
    { id: 'mapping', label: 'HandlerMapping', sublabel: 'getHandler()', kind: 'framework', x: 850, y: 330 },
    { id: 'adapter', label: 'HandlerAdapter', sublabel: 'RequestMappingHandlerAdapter', kind: 'framework', x: 580, y: 330 },
    { id: 'resolver', label: 'ArgumentResolver', sublabel: '+ HttpMessageConverter', kind: 'framework', x: 280, y: 330 },
    { id: 'controller', label: 'OrderController', sublabel: '@RestController', kind: 'app', x: 580, y: 580 },
    { id: 'returns', label: 'ReturnValueHandler', sublabel: '+ HttpMessageConverter', kind: 'framework', x: 280, y: 580 },
  ],
  states: [
    {
      node: 'tomcat',
      title: 'worker thread pool (예시 3개)',
      x: 172,
      y: 104,
      width: 300,
      view: {
        type: 'table',
        columns: ['thread', '상태'],
        rows: [
          ['http-nio-8080-exec-1', '대기'],
          ['http-nio-8080-exec-2', '대기'],
          ['http-nio-8080-exec-3', '대기'],
        ],
      },
    },
    {
      node: 'filters',
      title: 'Boot 기본 Filter (order 순)',
      x: 486,
      y: 104,
      width: 300,
      view: {
        type: 'table',
        columns: ['order', 'filter bean', '상태'],
        rows: [
          ['MIN_VALUE', 'characterEncodingFilter', '대기'],
          ['-9900', 'formContentFilter', '대기'],
          ['-105', 'requestContextFilter', '대기'],
        ],
      },
    },
    {
      node: 'mapping',
      title: 'handlerMappings (order 순, 일부)',
      x: 664,
      y: 382,
      width: 330,
      view: {
        type: 'table',
        columns: ['order', 'HandlerMapping', '반환'],
        rows: [
          ['-1', 'RouterFunctionMapping', '—'],
          ['0', 'RequestMappingHandlerMapping', '—'],
          ['2', 'BeanNameUrlHandlerMapping', '—'],
        ],
      },
    },
    {
      node: 'adapter',
      title: 'mavContainer · response',
      x: 420,
      y: 382,
      width: 236,
      view: {
        type: 'table',
        columns: ['항목', '값'],
        rows: [
          ['requestHandled', 'false'],
          ['status', '200'],
          ['committed', 'false'],
        ],
      },
    },
    {
      node: 'resolver',
      title: 'create() 인자',
      x: 14,
      y: 382,
      width: 396,
      view: { type: 'list', items: ['args[0] = (미해결)'] },
    },
  ],
  steps: [
    {
      id: 'arrive',
      kind: 'move',
      from: 'client',
      to: 'tomcat',
      token: { kind: 'request', label: 'POST /api/orders' },
      title: '요청이 Tomcat connector에 도착',
      summary: '`Acceptor`가 연결을 받고 `Poller`가 읽기 가능한 socket을 고릅니다.',
      detail: `Spring Boot의 embedded Tomcat은 기본 protocol로 \`Http11NioProtocol\`을 씁니다. connector 이름은 \`http-nio-8080\`처럼 prefix와 port로 만들어지고, 같은 이름이 thread 이름에도 붙습니다.

\`http-nio-8080-Acceptor\` thread가 TCP 연결을 accept하고, \`http-nio-8080-Poller\` thread가 NIO selector로 읽을 데이터가 생긴 socket을 찾습니다. 실제 HTTP 파싱과 애플리케이션 코드는 이 두 thread가 아니라 worker thread pool에서 실행됩니다.

연결 수와 대기열은 \`server.tomcat.max-connections\`(기본 8192)와 \`server.tomcat.accept-count\`(기본 100)가 정합니다.`,
      facts: [
        { key: 'protocol class', value: '`org.apache.coyote.http11.Http11NioProtocol`' },
        { key: 'server.port 기본값', value: '8080' },
        { key: 'connector 이름', value: '`"http-nio"` + `-` + port → `http-nio-8080`' },
        { key: 'accept thread', value: '`http-nio-8080-Acceptor`' },
        { key: 'poller thread', value: '`http-nio-8080-Poller`' },
        { key: 'server.tomcat.max-connections', value: '8192' },
        { key: 'server.tomcat.accept-count', value: '100' },
      ],
      record: {
        title: 'HTTP request',
        raw: 'POST /api/orders HTTP/1.1\nHost: localhost:8080\nContent-Type: application/json\nAccept: application/json\nContent-Length: 29\n\n{"productId":42,"quantity":2}',
        fields: [
          { name: 'method', value: 'POST', note: '`@PostMapping`과 매칭될 HTTP method' },
          { name: 'request-target', value: '/api/orders', note: '`HandlerMapping`이 lookup path로 씁니다' },
          { name: 'HTTP-version', value: 'HTTP/1.1', note: 'keep-alive가 기본인 버전' },
          { name: 'Host', value: 'localhost:8080' },
          { name: 'Content-Type', value: 'application/json', note: '`@RequestBody`를 읽을 converter를 고르는 기준' },
          { name: 'Accept', value: 'application/json', note: '응답 converter를 고르는 기준' },
          { name: 'Content-Length', value: '29', note: 'body `{"productId":42,"quantity":2}`의 byte 수' },
        ],
      },
      sources: [
        { label: 'TomcatWebServerFactory.DEFAULT_PROTOCOL', url: `${SB}/module/spring-boot-tomcat/src/main/java/org/springframework/boot/tomcat/TomcatWebServerFactory.java#L57`, version: SB_V },
        { label: 'AbstractConfigurableWebServerFactory port = 8080', url: `${SB}/module/spring-boot-web-server/src/main/java/org/springframework/boot/web/server/AbstractConfigurableWebServerFactory.java#L43`, version: SB_V },
        { label: 'Http11NioProtocol.getNamePrefix()', url: `${TC}/java/org/apache/coyote/http11/Http11NioProtocol.java#L97-L103`, version: TC_V },
        { label: 'AbstractProtocol.getNameInternal()', url: `${TC}/java/org/apache/coyote/AbstractProtocol.java#L657-L680`, version: TC_V },
        { label: 'AbstractProtocol: endpoint.setName() (따옴표 제거)', url: `${TC}/java/org/apache/coyote/AbstractProtocol.java#L956`, version: TC_V },
        { label: 'AbstractEndpoint: "-Acceptor" thread', url: `${TC}/java/org/apache/tomcat/util/net/AbstractEndpoint.java#L2310`, version: TC_V },
        { label: 'NioEndpoint: "-Poller" thread', url: `${TC}/java/org/apache/tomcat/util/net/NioEndpoint.java#L542`, version: TC_V },
        { label: 'TomcatServerProperties (max-connections, accept-count)', url: `${SB}/module/spring-boot-tomcat/src/main/java/org/springframework/boot/tomcat/autoconfigure/TomcatServerProperties.java#L108-L114`, version: SB_V },
      ],
    },
    {
      id: 'worker',
      kind: 'mutate',
      node: 'tomcat',
      after: {
        type: 'table',
        columns: ['thread', '상태'],
        rows: [
          ['http-nio-8080-exec-1', 'POST /api/orders'],
          ['http-nio-8080-exec-2', '대기'],
          ['http-nio-8080-exec-3', '대기'],
        ],
      },
      title: 'worker thread 하나가 요청을 맡음',
      summary: '`SocketProcessor`가 executor에 제출되고, 이 thread가 응답까지 요청을 끝까지 처리합니다.',
      detail: `\`Poller\`는 socket을 \`SocketProcessor\`로 감싸 \`executor.execute()\`로 worker thread pool에 넘깁니다. pool thread 이름은 connector 이름에 \`-exec-\`와 번호를 붙인 \`http-nio-8080-exec-N\`입니다. 그림의 \`exec-1\`은 예시이고, 실제로는 쉬고 있는 아무 thread나 맡습니다.

이 lesson의 나머지 단계(Filter, \`DispatcherServlet\`, controller, 응답 쓰기)는 모두 이 한 thread에서 동기적으로 실행됩니다. 그래서 \`ThreadLocal\` 기반의 \`RequestContextHolder\`나 transaction 동기화가 요청 단위로 동작합니다.

pool 크기는 \`server.tomcat.threads.max\`(기본 200)와 \`server.tomcat.threads.min-spare\`(기본 10)로 정합니다. 200개가 모두 바쁘면 새 요청은 큐에서 기다립니다.`,
      facts: [
        { key: 'thread 이름', value: '`http-nio-8080-exec-N`' },
        { key: 'server.tomcat.threads.max', value: '200' },
        { key: 'server.tomcat.threads.min-spare', value: '10' },
        { key: 'server.tomcat.threads.max-queue-capacity', value: '2147483647' },
        { key: '제출 지점', value: '`AbstractEndpoint.processSocket()` → `executor.execute(sc)`' },
      ],
      sources: [
        { label: 'AbstractEndpoint.createExecutor(): getName() + "-exec-"', url: `${TC}/java/org/apache/tomcat/util/net/AbstractEndpoint.java#L1952`, version: TC_V },
        { label: 'AbstractEndpoint.processSocket(): executor.execute(sc)', url: `${TC}/java/org/apache/tomcat/util/net/AbstractEndpoint.java#L2126`, version: TC_V },
        { label: 'TomcatServerProperties.Threads (max, min-spare, max-queue-capacity)', url: `${SB}/module/spring-boot-tomcat/src/main/java/org/springframework/boot/tomcat/autoconfigure/TomcatServerProperties.java#L629-L647`, version: SB_V },
      ],
    },
    {
      id: 'to-filters',
      kind: 'move',
      from: 'tomcat',
      to: 'filters',
      token: { kind: 'call', label: 'filterChain.doFilter()' },
      title: 'Valve pipeline을 지나 Filter chain으로',
      summary: '`CoyoteAdapter`가 container pipeline을 호출하고, `StandardWrapperValve`가 `ApplicationFilterChain`을 만듭니다.',
      detail: `worker thread의 \`Http11Processor\`가 request line과 header를 파싱한 뒤 \`CoyoteAdapter.service()\`를 부릅니다. 여기서 Tomcat의 Engine → Host → Context → Wrapper 순서로 각 container의 Valve pipeline이 실행됩니다.

마지막 \`StandardWrapperValve\`가 이 요청에 매핑된 Filter들과 대상 Servlet(\`DispatcherServlet\`)으로 \`ApplicationFilterChain\`을 만들고 \`filterChain.doFilter(request, response)\`를 호출합니다.`,
      facts: [
        { key: 'HTTP 파싱 후 호출', value: '`getAdapter().service(request, response)`' },
        { key: 'pipeline 시작', value: '`connector.getService().getContainer().getPipeline().getFirst().invoke(...)`' },
        { key: 'chain 생성', value: '`ApplicationFilterFactory.createFilterChain(request, wrapper, servlet)`' },
      ],
      sources: [
        { label: 'Http11Processor: getAdapter().service()', url: `${TC}/java/org/apache/coyote/http11/Http11Processor.java#L411`, version: TC_V },
        { label: 'CoyoteAdapter.service(): pipeline invoke', url: `${TC}/java/org/apache/catalina/connector/CoyoteAdapter.java#L347`, version: TC_V },
        { label: 'StandardWrapperValve: createFilterChain / doFilter', url: `${TC}/java/org/apache/catalina/core/StandardWrapperValve.java#L138-L164`, version: TC_V },
      ],
    },
    {
      id: 'filters-pass',
      kind: 'mutate',
      node: 'filters',
      after: {
        type: 'table',
        columns: ['order', 'filter bean', '상태'],
        rows: [
          ['MIN_VALUE', 'characterEncodingFilter', '통과'],
          ['-9900', 'formContentFilter', '통과'],
          ['-105', 'requestContextFilter', '통과'],
        ],
      },
      title: 'Filter가 order 순서로 실행됨',
      summary: 'Boot가 등록한 Filter bean 3개가 낮은 order부터 실행되고, 각자 `chain.doFilter()`로 다음을 부릅니다.',
      detail: `Spring Boot는 \`Filter\` 타입의 bean을 embedded container에 등록하고 기본으로 \`/*\`에 매핑합니다. 순서는 \`Ordered\`나 \`@Order\`로 정하며, order 값이 작을수록 먼저 실행됩니다. Spring Security나 Actuator 없이 \`spring-boot-starter-webmvc\`만 있으면 auto-configuration이 아래 Filter를 등록합니다.

\`characterEncodingFilter\`(\`Ordered.HIGHEST_PRECEDENCE\`)는 request encoding을 UTF-8로 강제합니다. response encoding은 기본으로 강제하지 않습니다. \`formContentFilter\`(-9900)는 \`PUT\`, \`PATCH\`, \`DELETE\` 요청의 \`application/x-www-form-urlencoded\` body만 파싱하므로 이 JSON \`POST\`에는 아무 일도 하지 않습니다. \`requestContextFilter\`(-105)는 request를 \`RequestContextHolder\`와 \`LocaleContextHolder\`에 묶고, \`finally\`에서 풉니다.

각 Filter는 \`chain.doFilter()\`를 부른 뒤에 나머지 코드를 실행합니다. 그래서 Filter chain은 요청 때 한 번, 응답 때 거꾸로 한 번 지나갑니다.`,
      facts: [
        { key: 'characterEncodingFilter order', value: '`Ordered.HIGHEST_PRECEDENCE` (Integer.MIN_VALUE)' },
        { key: 'formContentFilter order', value: '`REQUEST_WRAPPER_FILTER_MAX_ORDER - 9900` = -9900' },
        { key: 'requestContextFilter order', value: '`REQUEST_WRAPPER_FILTER_MAX_ORDER - 105` = -105' },
        { key: 'REQUEST_WRAPPER_FILTER_MAX_ORDER', value: '0' },
        { key: 'server.servlet.encoding.charset', value: 'UTF-8' },
        { key: 'force request / response 기본값', value: 'true / false' },
        { key: 'FormContentFilter 대상 method', value: 'PUT, PATCH, DELETE' },
      ],
      sources: [
        src.bootFilterDocs,
        { label: 'spring-boot-starter-webmvc dependencies (starter-tomcat 포함)', url: `${SB}/starter/spring-boot-starter-webmvc/build.gradle#L12-L17`, version: SB_V },
        { label: 'OrderedCharacterEncodingFilter order', url: `${SB}/module/spring-boot-servlet/src/main/java/org/springframework/boot/servlet/filter/OrderedCharacterEncodingFilter.java#L18`, version: SB_V },
        { label: 'OrderedFormContentFilter.DEFAULT_ORDER', url: `${SB}/module/spring-boot-servlet/src/main/java/org/springframework/boot/servlet/filter/OrderedFormContentFilter.java#L22`, version: SB_V },
        { label: 'OrderedRequestContextFilter order', url: `${SB}/module/spring-boot-servlet/src/main/java/org/springframework/boot/servlet/filter/OrderedRequestContextFilter.java#L19`, version: SB_V },
        { label: 'OrderedFilter.REQUEST_WRAPPER_FILTER_MAX_ORDER', url: `${SB}/module/spring-boot-servlet/src/main/java/org/springframework/boot/servlet/filter/OrderedFilter.java#L22`, version: SB_V },
        { label: 'ServletEncodingProperties (charset, shouldForce)', url: `${SB}/module/spring-boot-servlet/src/main/java/org/springframework/boot/servlet/autoconfigure/ServletEncodingProperties.java#L26-L94`, version: SB_V },
        { label: 'WebMvcAutoConfiguration: formContentFilter, requestContextFilter', url: `${SB}/module/spring-boot-webmvc/src/main/java/org/springframework/boot/webmvc/autoconfigure/WebMvcAutoConfiguration.java#L174-L177`, version: SB_V },
        { label: 'CharacterEncodingFilter.doFilterInternal()', url: `${SF}/spring-web/src/main/java/org/springframework/web/filter/CharacterEncodingFilter.java#L186-L200`, version: SF_V },
        { label: 'FormContentFilter HTTP_METHODS', url: `${SF}/spring-web/src/main/java/org/springframework/web/filter/FormContentFilter.java#L59`, version: SF_V },
        { label: 'RequestContextFilter: init / reset context holders', url: `${SF}/spring-web/src/main/java/org/springframework/web/filter/RequestContextFilter.java#L97-L103`, version: SF_V },
      ],
    },
    {
      id: 'to-dispatcher',
      kind: 'move',
      from: 'filters',
      to: 'dispatcher',
      token: { kind: 'call', label: 'servlet.service()' },
      title: '마지막 Filter 다음은 DispatcherServlet',
      summary: '`ApplicationFilterChain`이 Filter를 다 돌면 `servlet.service()`를 부르고, `doPost()` → `processRequest()` → `doService()` → `doDispatch()`로 들어갑니다.',
      detail: `\`ApplicationFilterChain\`은 남은 Filter가 없으면 대상 Servlet의 \`service(request, response)\`를 호출합니다. Spring Boot에서 이 Servlet은 \`/\`에 매핑된 \`DispatcherServlet\` 하나입니다.

\`FrameworkServlet.service()\`는 표준 HTTP method면 \`HttpServlet.service()\`로 보내고, 그 결과 \`doPost()\`가 \`processRequest()\`를 부릅니다. \`processRequest()\`가 \`DispatcherServlet.doService()\`를 부르고, \`doService()\`가 request attribute(예: \`WebApplicationContext\`)를 준비한 뒤 \`doDispatch()\`를 호출합니다. 실제 분배는 모두 \`doDispatch()\`에서 일어납니다.`,
      facts: [
        { key: 'Filter 다음 호출', value: '`servlet.service(request, response)`' },
        { key: 'POST 진입', value: '`FrameworkServlet.doPost()` → `processRequest()`' },
        { key: '분배 메서드', value: '`DispatcherServlet.doDispatch()`' },
        { key: 'WebApplicationContext attribute', value: '`DispatcherServlet.WEB_APPLICATION_CONTEXT_ATTRIBUTE`' },
      ],
      sources: [
        { label: 'ApplicationFilterChain.internalDoFilter(): servlet.service()', url: `${TC}/java/org/apache/catalina/core/ApplicationFilterChain.java#L111-L132`, version: TC_V },
        { label: 'FrameworkServlet.service() / doPost() / processRequest()', url: `${WEBMVC}/FrameworkServlet.java#L870-L1000`, version: SF_V },
        { label: 'DispatcherServlet.doService()', url: `${WEBMVC}/DispatcherServlet.java#L829`, version: SF_V },
        src.dispatcherDocs,
        src.bootFilterDocs,
      ],
    },
    {
      id: 'to-mapping',
      kind: 'move',
      from: 'dispatcher',
      to: 'mapping',
      token: { kind: 'call', label: 'getHandler(request)' },
      title: 'HandlerMapping에게 handler를 묻기',
      summary: '`doDispatch()`는 multipart를 확인한 뒤 `getHandler()`로 등록된 `HandlerMapping`을 order 순서대로 물어봅니다.',
      detail: `\`doDispatch()\`는 먼저 \`checkMultipart()\`로 multipart 요청인지 확인합니다. 이 요청은 JSON이므로 그대로 진행합니다.

그다음 \`getHandler()\`가 \`handlerMappings\` 목록을 차례로 돌며 \`mapping.getHandler(request)\`를 부르고, null이 아닌 첫 결과를 씁니다. \`DispatcherServlet\`은 context의 모든 \`HandlerMapping\` bean을 찾아 \`AnnotationAwareOrderComparator\`로 정렬해 둡니다. MVC 설정이 등록하는 order는 \`RouterFunctionMapping\` -1, \`RequestMappingHandlerMapping\` 0, \`BeanNameUrlHandlerMapping\` 2입니다.

아무 mapping도 handler를 돌려주지 않으면 \`noHandlerFound()\`가 \`NoHandlerFoundException\`을 던집니다.`,
      facts: [
        { key: '순회 방식', value: 'order 순서, null이 아닌 첫 `HandlerExecutionChain` 반환' },
        { key: 'RouterFunctionMapping order', value: '-1' },
        { key: 'RequestMappingHandlerMapping order', value: '0' },
        { key: 'BeanNameUrlHandlerMapping order', value: '2' },
        { key: 'handler가 없으면', value: '`NoHandlerFoundException`' },
      ],
      sources: [
        src.doDispatch,
        { label: 'DispatcherServlet.getHandler()', url: `${WEBMVC}/DispatcherServlet.java#L1154-L1165`, version: SF_V },
        { label: 'DispatcherServlet.initHandlerMappings(): sort', url: `${WEBMVC}/DispatcherServlet.java#L516`, version: SF_V },
        { label: 'WebMvcConfigurationSupport: HandlerMapping orders', url: `${WEBMVC}/config/annotation/WebMvcConfigurationSupport.java#L268-L556`, version: SF_V },
        src.specialBeans,
      ],
    },
    {
      id: 'mapping-match',
      kind: 'mutate',
      node: 'mapping',
      after: {
        type: 'table',
        columns: ['order', 'HandlerMapping', '반환'],
        rows: [
          ['-1', 'RouterFunctionMapping', 'null'],
          ['0', 'RequestMappingHandlerMapping', 'HandlerMethod'],
          ['2', 'BeanNameUrlHandlerMapping', '—'],
        ],
      },
      title: '@PostMapping 메서드를 찾음',
      summary: '`RequestMappingHandlerMapping`이 path와 method로 `OrderController#create`를 찾고, interceptor와 함께 `HandlerExecutionChain`으로 돌려줍니다.',
      detail: `등록된 \`RouterFunction\`이 없으니 \`RouterFunctionMapping\`은 null을 돌려줍니다. 다음 \`RequestMappingHandlerMapping\`은 \`lookupHandlerMethod()\`에서 lookup path \`/api/orders\`와 method \`POST\` 등 \`@RequestMapping\` 조건을 비교해 \`OrderController#create\`를 고릅니다. path 비교에는 6.0부터 기본값인 \`PathPatternParser\`를 씁니다.

결과는 handler(\`HandlerMethod\`)와 그 mapping에 걸린 interceptor 목록을 묶은 \`HandlerExecutionChain\`입니다. 첫 non-null 결과가 나왔으므로 \`BeanNameUrlHandlerMapping\`은 조회하지 않습니다(그림의 —).`,
      facts: [
        { key: '매칭 메서드', value: '`AbstractHandlerMethodMapping.lookupHandlerMethod()`' },
        { key: 'path 매칭 기본값', value: '`PathPatternParser` (6.0부터)' },
        { key: '반환 타입', value: '`HandlerExecutionChain`' },
        { key: 'handler', value: '`HandlerMethod` OrderController#create(OrderRequest)' },
      ],
      record: {
        title: 'HandlerExecutionChain',
        fields: [
          { name: 'handler', value: 'HandlerMethod: OrderController#create(OrderRequest)', note: '`@PostMapping`이 붙은 controller 메서드' },
          { name: 'interceptorList[0]', value: 'ConversionServiceExposingInterceptor', note: 'MVC 설정이 모든 mapping에 추가' },
          { name: 'interceptorList[1]', value: 'ResourceUrlProviderExposingInterceptor', note: 'MVC 설정이 모든 mapping에 추가' },
        ],
      },
      sources: [
        { label: 'AbstractHandlerMethodMapping.lookupHandlerMethod()', url: `${WEBMVC}/handler/AbstractHandlerMethodMapping.java#L393`, version: SF_V },
        { label: 'AbstractHandlerMapping: PathPatternParser default', url: `${WEBMVC}/handler/AbstractHandlerMapping.java#L95`, version: SF_V },
        { label: 'WebMvcConfigurationSupport.getInterceptors()', url: `${WEBMVC}/config/annotation/WebMvcConfigurationSupport.java#L303-L311`, version: SF_V },
        src.interceptorDocs,
      ],
    },
    {
      id: 'to-adapter',
      kind: 'move',
      from: 'dispatcher',
      to: 'adapter',
      token: { kind: 'call', label: 'ha.handle(req, res, handler)' },
      title: 'preHandle 다음 HandlerAdapter 호출',
      summary: 'interceptor의 `preHandle()`이 모두 true면, `supports(handler)`가 true인 `HandlerAdapter`를 골라 `handle()`을 부릅니다.',
      detail: `\`doDispatch()\`는 \`mappedHandler.applyPreHandle()\`로 interceptor의 \`preHandle()\`을 등록 순서대로 부릅니다. 하나라도 false를 돌려주면 handler는 실행되지 않고 \`doDispatch()\`가 바로 끝납니다.

\`DispatcherServlet\`은 handler의 타입을 직접 알지 못합니다. \`getHandlerAdapter()\`가 \`handlerAdapters\`를 돌며 \`supports(handler)\`가 true인 첫 adapter를 고릅니다. \`RequestMappingHandlerAdapter\`는 handler가 \`HandlerMethod\`일 때 true를 돌려줍니다. 이렇게 adapter를 두면 \`@Controller\` 메서드, \`HttpRequestHandler\`, functional endpoint를 같은 \`doDispatch()\` 코드로 실행할 수 있습니다.`,
      facts: [
        { key: 'preHandle 실패 시', value: '`applyPreHandle()`이 false → handler 실행 없이 반환' },
        { key: 'adapter 선택', value: '`supports(handler)`가 true인 첫 adapter' },
        { key: 'RequestMappingHandlerAdapter.supports', value: '`handler instanceof HandlerMethod`' },
        { key: '호출', value: '`ha.handle(processedRequest, response, handler)`' },
      ],
      sources: [
        src.doDispatch,
        { label: 'HandlerExecutionChain.applyPreHandle()', url: `${WEBMVC}/HandlerExecutionChain.java#L142`, version: SF_V },
        { label: 'DispatcherServlet.getHandlerAdapter()', url: `${WEBMVC}/DispatcherServlet.java#L1185-L1196`, version: SF_V },
        { label: 'AbstractHandlerMethodAdapter.supports()', url: `${WEBMVC}/mvc/method/AbstractHandlerMethodAdapter.java#L68-L69`, version: SF_V },
        src.interceptorDocs,
      ],
    },
    {
      id: 'to-resolver',
      kind: 'move',
      from: 'adapter',
      to: 'resolver',
      token: { kind: 'data', label: '29 bytes JSON' },
      title: '인자마다 argument resolver를 찾음',
      summary: '`InvocableHandlerMethod.getMethodArgumentValues()`가 파라미터별로 resolver를 고릅니다. `@RequestBody`는 `RequestResponseBodyMethodProcessor`가 맡습니다.',
      detail: `\`RequestMappingHandlerAdapter.invokeHandlerMethod()\`는 \`HandlerMethod\`를 \`ServletInvocableHandlerMethod\`로 감싸고 \`invokeAndHandle()\`을 부릅니다. 메서드를 부르기 전에 \`getMethodArgumentValues()\`가 파라미터마다 \`supportsParameter()\`가 true인 resolver를 찾습니다.

기본 resolver 목록은 annotation 기반(\`@RequestParam\`, \`@PathVariable\`, \`@RequestBody\` 등) → type 기반(\`ServletRequest\`, \`Model\` 등) → custom → catch-all 순서입니다. \`create(@RequestBody OrderRequest request)\`의 파라미터는 \`parameter.hasParameterAnnotation(RequestBody.class)\`이 true인 \`RequestResponseBodyMethodProcessor\`가 처리합니다.`,
      facts: [
        { key: '호출 경로', value: '`invokeHandlerMethod()` → `invokeAndHandle()` → `invokeForRequest()` → `getMethodArgumentValues()`' },
        { key: '선택 기준', value: '`HandlerMethodArgumentResolver.supportsParameter()`' },
        { key: '@RequestBody resolver', value: '`RequestResponseBodyMethodProcessor`' },
        { key: '기본 resolver 목록 초기 용량', value: '`new ArrayList<>(30)`' },
      ],
      sources: [
        { label: 'RequestMappingHandlerAdapter.getDefaultArgumentResolvers()', url: `${WEBMVC}/mvc/method/annotation/RequestMappingHandlerAdapter.java#L644-L690`, version: SF_V },
        { label: 'RequestMappingHandlerAdapter.invokeHandlerMethod()', url: `${WEBMVC}/mvc/method/annotation/RequestMappingHandlerAdapter.java#L885-L940`, version: SF_V },
        { label: 'InvocableHandlerMethod.invokeForRequest() / getMethodArgumentValues()', url: `${SF}/spring-web/src/main/java/org/springframework/web/method/support/InvocableHandlerMethod.java#L171-L230`, version: SF_V },
        { label: 'RequestResponseBodyMethodProcessor.supportsParameter()', url: `${WEBMVC}/mvc/method/annotation/RequestResponseBodyMethodProcessor.java#L134-L136`, version: SF_V },
      ],
    },
    {
      id: 'read-body',
      kind: 'mutate',
      node: 'resolver',
      after: { type: 'list', items: ['args[0] = OrderRequest[productId=42, quantity=2]'] },
      title: 'HttpMessageConverter가 JSON을 객체로 읽음',
      summary: '`Content-Type: application/json`을 읽을 수 있는 첫 converter, `JacksonJsonHttpMessageConverter`가 body를 `OrderRequest`로 역직렬화합니다.',
      detail: `\`readWithMessageConverters()\`는 등록된 \`HttpMessageConverter\`를 순서대로 돌며 \`canRead(대상 타입, Content-Type)\`가 true인 첫 converter로 body를 읽습니다. Spring Framework 7은 Jackson 3용 \`JacksonJsonHttpMessageConverter\`를 제공하고, Spring Boot는 \`JsonMapper\` bean이 있으면 이 converter를 등록합니다. 이 converter의 기본 media type은 \`application/json\`과 \`application/*+json\`입니다.

읽은 뒤 \`@Valid\`나 \`@Validated\`가 있으면 \`validateIfApplicable()\`이 검증하고, 오류가 있으면 \`MethodArgumentNotValidException\`을 던집니다. body가 비었는데 \`required\`(기본 true)면 \`HttpMessageNotReadableException\`이 납니다.`,
      facts: [
        { key: 'converter 선택', value: '`canRead(targetType, contextClass, contentType)`가 true인 첫 converter' },
        { key: 'JSON converter', value: '`JacksonJsonHttpMessageConverter` (Jackson 3, `tools.jackson`)' },
        { key: '지원 media type', value: '`application/json`, `application/*+json`' },
        { key: '검증 실패', value: '`MethodArgumentNotValidException`' },
        { key: 'body 없음 + required', value: '`HttpMessageNotReadableException`' },
      ],
      record: {
        title: 'JSON body → OrderRequest',
        raw: '{"productId":42,"quantity":2}',
        fields: [
          { name: 'productId', value: '42', note: 'JSON number → `OrderRequest.productId`' },
          { name: 'quantity', value: '2', note: 'JSON number → `OrderRequest.quantity`' },
        ],
      },
      sources: [
        { label: 'AbstractMessageConverterMethodArgumentResolver.readWithMessageConverters()', url: `${WEBMVC}/mvc/method/annotation/AbstractMessageConverterMethodArgumentResolver.java#L147-L200`, version: SF_V },
        { label: 'RequestResponseBodyMethodProcessor.resolveArgument()', url: `${WEBMVC}/mvc/method/annotation/RequestResponseBodyMethodProcessor.java#L152-L186`, version: SF_V },
        { label: 'JacksonJsonHttpMessageConverter media types', url: `${SF}/spring-web/src/main/java/org/springframework/http/converter/json/JacksonJsonHttpMessageConverter.java#L55-L61`, version: SF_V },
        { label: 'Boot JacksonHttpMessageConvertersConfiguration', url: `${SB}/module/spring-boot-http-converter/src/main/java/org/springframework/boot/http/converter/autoconfigure/JacksonHttpMessageConvertersConfiguration.java#L63-L79`, version: SB_V },
        src.requestBodyDocs,
      ],
    },
    {
      id: 'invoke',
      kind: 'move',
      from: 'adapter',
      to: 'controller',
      token: { kind: 'call', label: 'create(request)' },
      title: 'controller 메서드 실행',
      summary: '준비된 인자로 `doInvoke()`가 reflection으로 `OrderController.create()`를 부릅니다.',
      detail: `인자가 모두 준비되면 \`InvocableHandlerMethod.doInvoke()\`가 reflection으로 bean의 메서드를 호출합니다. 여기서부터가 애플리케이션 코드입니다. 이 예시의 controller는 다음과 같습니다.

\`@RestController\` \`@RequestMapping("/api/orders")\` 클래스의 \`@PostMapping\` \`@ResponseStatus(HttpStatus.CREATED)\` \`OrderResponse create(@RequestBody OrderRequest request)\`.

controller가 service를 부르고 DB에 다녀오는 동안에도 같은 \`http-nio-8080-exec-1\` thread가 기다립니다.`,
      facts: [
        { key: '호출', value: '`InvocableHandlerMethod.doInvoke(args)`' },
        { key: '실행 thread', value: '같은 worker thread (`http-nio-8080-exec-N`)' },
        { key: '반환 값', value: '`OrderResponse[orderId=1001, status=CREATED]` (예시)' },
      ],
      sources: [
        { label: 'InvocableHandlerMethod.doInvoke()', url: `${SF}/spring-web/src/main/java/org/springframework/web/method/support/InvocableHandlerMethod.java#L243`, version: SF_V },
        { label: 'ServletInvocableHandlerMethod.invokeAndHandle()', url: `${WEBMVC}/mvc/method/annotation/ServletInvocableHandlerMethod.java#L114-L144`, version: SF_V },
      ],
    },
    {
      id: 'status',
      kind: 'mutate',
      node: 'adapter',
      after: {
        type: 'table',
        columns: ['항목', '값'],
        rows: [
          ['requestHandled', 'false'],
          ['status', '201'],
          ['committed', 'false'],
        ],
      },
      title: '@ResponseStatus가 상태 코드를 바꿈',
      summary: '메서드가 반환되면 `setResponseStatus()`가 `@ResponseStatus(CREATED)`를 읽어 `response.setStatus(201)`을 부릅니다.',
      detail: `\`invokeAndHandle()\`은 \`invokeForRequest()\`가 값을 돌려준 직후 \`setResponseStatus()\`를 부릅니다. 메서드에 \`@ResponseStatus\`가 있으면 그 값으로 \`response.setStatus()\`를 호출합니다. \`reason\`이 있으면 대신 \`response.sendError()\`를 부르고 요청을 끝냅니다.

아직 header나 body는 하나도 전송되지 않았으므로(\`committed = false\`) 상태 코드는 자유롭게 바뀝니다. 반환 값이 null이 아니고 \`reason\`도 없으므로 \`requestHandled\`를 false로 두고 return value 처리로 넘어갑니다.`,
      facts: [
        { key: 'status 설정', value: '`response.setStatus(status.value())`' },
        { key: 'reason이 있으면', value: '`response.sendError(status, reason)` 후 종료' },
        { key: 'HTTP 상태', value: '201 Created' },
      ],
      sources: [
        { label: 'ServletInvocableHandlerMethod.setResponseStatus()', url: `${WEBMVC}/mvc/method/annotation/ServletInvocableHandlerMethod.java#L149-L168`, version: SF_V },
        { label: 'ServletInvocableHandlerMethod.invokeAndHandle()', url: `${WEBMVC}/mvc/method/annotation/ServletInvocableHandlerMethod.java#L114-L144`, version: SF_V },
      ],
    },
    {
      id: 'to-returns',
      kind: 'move',
      from: 'controller',
      to: 'returns',
      token: { kind: 'data', label: 'OrderResponse' },
      title: '반환 값을 처리할 handler 선택',
      summary: '`HandlerMethodReturnValueHandlerComposite`가 `supportsReturnType()`이 true인 첫 handler를 고릅니다. `@RestController`이므로 `RequestResponseBodyMethodProcessor`입니다.',
      detail: `반환 값 처리기 목록은 단일 용도 타입(\`ModelAndView\`, \`ResponseEntity\`, \`Callable\` 등) → annotation 기반(\`@ModelAttribute\`, \`@ResponseBody\`) → 다용도 타입(view 이름, \`Map\`) → custom → catch-all 순서입니다.

\`OrderResponse\`는 앞쪽 타입 어디에도 해당하지 않습니다. \`RequestResponseBodyMethodProcessor.supportsReturnType()\`은 클래스나 메서드에 \`@ResponseBody\`가 있는지 봅니다. \`@RestController\`는 \`@ResponseBody\`를 meta-annotation으로 가지므로 true입니다.

그래서 같은 \`RequestResponseBodyMethodProcessor\`가 인자 쪽(\`@RequestBody\`)과 반환 쪽(\`@ResponseBody\`)을 모두 맡습니다.`,
      facts: [
        { key: '선택 기준', value: '`HandlerMethodReturnValueHandler.supportsReturnType()`' },
        { key: '선택된 handler', value: '`RequestResponseBodyMethodProcessor`' },
        { key: 'supportsReturnType 조건', value: '클래스 또는 메서드에 `@ResponseBody`' },
      ],
      sources: [
        { label: 'RequestMappingHandlerAdapter.getDefaultReturnValueHandlers()', url: `${WEBMVC}/mvc/method/annotation/RequestMappingHandlerAdapter.java#L730-L775`, version: SF_V },
        { label: 'HandlerMethodReturnValueHandlerComposite.selectHandler()', url: `${SF}/spring-web/src/main/java/org/springframework/web/method/support/HandlerMethodReturnValueHandlerComposite.java#L70-L90`, version: SF_V },
        { label: 'RequestResponseBodyMethodProcessor.supportsReturnType()', url: `${WEBMVC}/mvc/method/annotation/RequestResponseBodyMethodProcessor.java#L139-L143`, version: SF_V },
        src.responseBodyDocs,
        { label: 'Reference: Declaration (@RestController = @Controller + @ResponseBody)', url: `${SF_DOCS}/mvc-controller/ann.adoc`, version: SF_V },
      ],
    },
    {
      id: 'write-body',
      kind: 'mutate',
      node: 'adapter',
      after: {
        type: 'table',
        columns: ['항목', '값'],
        rows: [
          ['requestHandled', 'true'],
          ['status', '201'],
          ['committed', 'true'],
        ],
      },
      title: 'content negotiation 후 응답 body를 씀',
      summary: '`requestHandled = true`로 표시하고, `Accept`와 converter가 만들 수 있는 type을 비교해 `application/json`으로 씁니다.',
      detail: `\`handleReturnValue()\`는 먼저 \`mavContainer.setRequestHandled(true)\`로 "view를 렌더링하지 말 것"을 표시하고 \`writeWithMessageConverters()\`를 부릅니다.

content negotiation은 요청의 \`Accept\`에서 얻은 acceptable type과, 반환 타입을 쓸 수 있는 converter들의 producible type을 비교해 \`selectedMediaType\`을 정합니다. 여기서는 \`application/json\`이 선택되고 \`JacksonJsonHttpMessageConverter\`가 \`OrderResponse\`를 JSON으로 씁니다. 이 converter는 \`Content-Length\`를 미리 계산하지 않고 stream에 쓴 뒤 \`flush()\`합니다.

reference 문서대로 \`@ResponseBody\`의 응답은 \`HandlerAdapter\` 안에서 쓰이고 commit됩니다. 그래서 이후 \`postHandle()\`에서 header를 추가하기에는 늦습니다. 이럴 때는 \`ResponseBodyAdvice\`를 씁니다.`,
      facts: [
        { key: 'view 생략 표시', value: '`mavContainer.setRequestHandled(true)`' },
        { key: 'selectedMediaType', value: '`application/json`' },
        { key: 'Content-Type', value: '`application/json` (Jackson converter는 charset을 붙이지 않음)' },
        { key: 'getContentLength() 기본값', value: 'null → 길이를 미리 모름' },
        { key: 'header 추가 시점', value: '`postHandle()`은 늦음 → `ResponseBodyAdvice`' },
      ],
      record: {
        title: 'Spring이 정한 응답',
        raw: 'status = 201\nContent-Type: application/json\n\n{"orderId":1001,"status":"CREATED"}',
        fields: [
          { name: 'status', value: '201', note: '`@ResponseStatus(HttpStatus.CREATED)`에서' },
          { name: 'Content-Type', value: 'application/json', note: 'content negotiation 결과 `selectedMediaType`' },
          { name: 'body', value: '{"orderId":1001,"status":"CREATED"}', note: '35 bytes, `JacksonJsonHttpMessageConverter`가 직렬화' },
        ],
      },
      sources: [
        { label: 'RequestResponseBodyMethodProcessor.handleReturnValue()', url: `${WEBMVC}/mvc/method/annotation/RequestResponseBodyMethodProcessor.java#L195-L214`, version: SF_V },
        { label: 'AbstractMessageConverterMethodProcessor.writeWithMessageConverters()', url: `${WEBMVC}/mvc/method/annotation/AbstractMessageConverterMethodProcessor.java#L205-L330`, version: SF_V },
        { label: 'AbstractHttpMessageConverter.addDefaultHeaders() / getContentLength()', url: `${SF}/spring-web/src/main/java/org/springframework/http/converter/AbstractHttpMessageConverter.java#L244-L296`, version: SF_V },
        { label: 'AbstractJacksonHttpMessageConverter.writeInternal(): flush()', url: `${SF}/spring-web/src/main/java/org/springframework/http/converter/AbstractJacksonHttpMessageConverter.java#L395-L440`, version: SF_V },
        src.interceptorDocs,
      ],
    },
    {
      id: 'no-view',
      kind: 'move',
      from: 'adapter',
      to: 'dispatcher',
      token: { kind: 'data', label: 'ModelAndView = null' },
      title: 'ModelAndView 없이 DispatcherServlet으로 복귀',
      summary: '`requestHandled`가 true이므로 `getModelAndView()`가 null을 돌려주고, `render()`는 건너뜁니다.',
      detail: `\`RequestMappingHandlerAdapter.getModelAndView()\`는 \`mavContainer.isRequestHandled()\`가 true면 null을 돌려줍니다. \`doDispatch()\`는 이어서 \`applyPostHandle()\`로 interceptor의 \`postHandle()\`을 부르고, \`processDispatchResult()\`로 갑니다.

\`processDispatchResult()\`는 \`mv != null\`일 때만 \`render()\`를 부르므로 \`ViewResolver\`는 쓰이지 않습니다. 마지막으로 interceptor의 \`afterCompletion()\`이 불립니다. 처리 중 예외가 났다면 이 지점에서 \`HandlerExceptionResolver\`(예: \`@ExceptionHandler\`)가 오류 응답을 만듭니다.`,
      facts: [
        { key: 'handle() 반환', value: 'null (`isRequestHandled()` true)' },
        { key: 'render 조건', value: '`mv != null && !mv.wasCleared()`' },
        { key: 'interceptor 순서', value: '`preHandle` → handler → `postHandle` → `afterCompletion`' },
        { key: '예외 처리', value: '`HandlerExceptionResolver` 빈들' },
      ],
      sources: [
        { label: 'RequestMappingHandlerAdapter.getModelAndView()', url: `${WEBMVC}/mvc/method/annotation/RequestMappingHandlerAdapter.java#L1037-L1042`, version: SF_V },
        { label: 'DispatcherServlet.processDispatchResult()', url: `${WEBMVC}/DispatcherServlet.java#L1022-L1060`, version: SF_V },
        src.doDispatch,
        src.dispatcherDocs,
      ],
    },
    {
      id: 'unwind',
      kind: 'move',
      from: 'dispatcher',
      to: 'filters',
      token: { kind: 'response', label: '201 Created' },
      title: 'Filter chain을 거꾸로 빠져나옴',
      summary: '`doDispatch()`가 끝나면 각 Filter의 `chain.doFilter()` 다음 코드가 역순으로 실행됩니다.',
      detail: `\`DispatcherServlet.service()\`가 반환되면 call stack이 풀리면서 Filter들이 등록의 역순으로 \`chain.doFilter()\` 뒤의 코드를 실행합니다. \`requestContextFilter\`는 \`finally\`에서 \`RequestContextHolder\`와 \`LocaleContextHolder\`를 비웁니다. 같은 thread가 다음 요청을 받을 때 이전 요청의 값이 남지 않게 하기 위해서입니다.

body는 이미 commit되었으므로 이 시점의 Filter가 응답 header를 바꿔도 반영되지 않습니다. header를 바꾸는 Filter는 \`chain.doFilter()\`를 부르기 전에 하거나 response를 wrapper로 감싸야 합니다.`,
      facts: [
        { key: '실행 순서', value: '요청 때의 역순 (call stack unwind)' },
        { key: 'requestContextFilter', value: '`finally { resetContextHolders(); }`' },
        { key: 'commit 이후 header 변경', value: '반영되지 않음' },
      ],
      sources: [
        { label: 'RequestContextFilter.doFilterInternal()', url: `${SF}/spring-web/src/main/java/org/springframework/web/filter/RequestContextFilter.java#L97-L103`, version: SF_V },
        { label: 'ApplicationFilterChain.internalDoFilter()', url: `${TC}/java/org/apache/catalina/core/ApplicationFilterChain.java#L111-L132`, version: TC_V },
        src.interceptorDocs,
      ],
    },
    {
      id: 'respond',
      kind: 'move',
      from: 'tomcat',
      to: 'client',
      token: { kind: 'response', label: '201 · chunked' },
      title: 'Tomcat이 응답을 전송',
      summary: '`Content-Length`를 모르므로 HTTP/1.1에서는 `Transfer-Encoding: chunked`로 보내고, `Date` header를 붙입니다.',
      detail: `Tomcat의 \`Http11Processor.prepareResponse()\`는 header를 보낼 때 body 길이를 정하는 방법을 고릅니다. trailer가 없고 \`Content-Length\`가 정해져 있지 않으며 HTTP/1.1이고 body가 있으면 \`Transfer-Encoding: chunked\`를 붙입니다. Spring의 Jackson converter가 길이를 미리 정하지 않고 \`flush()\`했으므로 이 경우에 해당합니다.

application이 \`Date\` header를 직접 넣지 않았으므로 Tomcat이 현재 시각으로 \`Date\`를 붙입니다. 요청에 \`Connection: close\`가 없으므로 연결은 keep-alive로 남아 다음 요청을 기다립니다.`,
      facts: [
        { key: 'body 길이 표시', value: '`Transfer-Encoding: chunked` (HTTP/1.1, 길이 모름)' },
        { key: 'Content-Length를 알면', value: '`Content-Length` header + identity encoding' },
        { key: 'Date', value: 'application이 안 넣었으면 Tomcat이 추가' },
        { key: 'chunk 크기 표기', value: '16진수 (35 bytes = `23`)' },
      ],
      record: {
        title: 'HTTP response (전송 형태)',
        raw: 'HTTP/1.1 201 \nContent-Type: application/json\nTransfer-Encoding: chunked\nDate: Tue, 03 Nov 2026 05:12:09 GMT\n\n{"orderId":1001,"status":"CREATED"}',
        fields: [
          { name: 'status-line', value: 'HTTP/1.1 201 ', note: 'Tomcat은 reason phrase("Created")를 보내지 않고, 그 앞의 공백만 씁니다' },
          { name: 'Content-Type', value: 'application/json', note: 'Spring converter가 정한 값' },
          { name: 'Transfer-Encoding', value: 'chunked', note: 'Tomcat이 추가. body는 `23\\r\\n...\\r\\n0\\r\\n\\r\\n` 형식의 chunk로 감싸집니다' },
          { name: 'Date', value: 'Tue, 03 Nov 2026 05:12:09 GMT', note: 'Tomcat이 추가 (값은 예시)' },
        ],
      },
      sources: [
        { label: 'Http11Processor.prepareResponse(): chunked / Content-Length', url: `${TC}/java/org/apache/coyote/http11/Http11Processor.java#L951-L978`, version: TC_V },
        { label: 'Http11Processor.prepareResponse(): Date header', url: `${TC}/java/org/apache/coyote/http11/Http11Processor.java#L985-L989`, version: TC_V },
        { label: 'Http11OutputBuffer.sendStatus(): reason phrase 생략', url: `${TC}/java/org/apache/coyote/http11/Http11OutputBuffer.java#L345-L378`, version: TC_V },
        { label: 'AbstractJacksonHttpMessageConverter.writeInternal(): flush()', url: `${SF}/spring-web/src/main/java/org/springframework/http/converter/AbstractJacksonHttpMessageConverter.java#L395-L440`, version: SF_V },
      ],
    },
    {
      id: 'release',
      kind: 'mutate',
      node: 'tomcat',
      after: {
        type: 'table',
        columns: ['thread', '상태'],
        rows: [
          ['http-nio-8080-exec-1', '대기'],
          ['http-nio-8080-exec-2', '대기'],
          ['http-nio-8080-exec-3', '대기'],
        ],
      },
      title: 'worker thread가 pool로 돌아감',
      summary: '`SocketProcessor`가 끝나면 thread는 pool로 돌아가고, keep-alive socket은 다시 `Poller`가 지켜봅니다.',
      detail: `응답을 다 쓴 뒤 \`SocketProcessor\` 작업이 끝나면 worker thread는 pool로 돌아가 다음 작업을 기다립니다. keep-alive 연결의 socket은 \`Poller\`에 다시 등록되어 같은 연결로 다음 요청이 오면 그때 또 worker thread에 배정됩니다.

요청 하나가 worker thread 하나를 응답이 끝날 때까지 붙잡는다는 점이 이 모델의 핵심입니다. controller가 느린 외부 호출을 기다리면 그만큼 \`server.tomcat.threads.max\`(기본 200) 중 하나가 묶입니다.`,
      facts: [
        { key: '동시 처리 상한', value: '`server.tomcat.threads.max` = 200 (기본)' },
        { key: 'keep-alive socket', value: '`Poller`가 다시 감시' },
        { key: '요청당 thread', value: '1개, 응답이 끝날 때까지' },
      ],
      sources: [
        { label: 'AbstractProtocol.ConnectionHandler: keep-alive면 registerReadInterest()', url: `${TC}/java/org/apache/coyote/AbstractProtocol.java#L1377-L1382`, version: TC_V },
        { label: 'NioEndpoint: Poller / SocketProcessor', url: `${TC}/java/org/apache/tomcat/util/net/NioEndpoint.java#L902`, version: TC_V },
        { label: 'TomcatServerProperties.Threads', url: `${SB}/module/spring-boot-tomcat/src/main/java/org/springframework/boot/tomcat/autoconfigure/TomcatServerProperties.java#L629-L647`, version: SB_V },
      ],
    },
  ],
  selfCheck: [
    {
      question: 'embedded Tomcat에서 controller 코드를 실행하는 thread의 이름 형식과, Spring Boot 기본 최대 개수는?',
      answer: '`http-nio-8080-exec-N`. connector 이름(`http-nio` + port)에 `-exec-`와 번호가 붙습니다. 최대 개수는 `server.tomcat.threads.max`의 기본값 200입니다.',
    },
    {
      question: '`spring-boot-starter-webmvc`만 있을 때 Boot가 등록하는 Filter 3개와 실행 순서는?',
      answer: '`characterEncodingFilter`(`Ordered.HIGHEST_PRECEDENCE`) → `formContentFilter`(-9900) → `requestContextFilter`(-105). order 값이 작을수록 먼저 실행되고, 응답 때는 역순으로 빠져나옵니다.',
    },
    {
      question: '`DispatcherServlet`은 handler를 어떻게 찾고, 언제 탐색을 멈추나요? 이 요청에서 handler를 찾은 `HandlerMapping`은?',
      answer: '정렬된 `handlerMappings`를 order 순서로 돌며 `getHandler()`를 부르고, null이 아닌 첫 `HandlerExecutionChain`에서 멈춥니다. `RouterFunctionMapping`(-1)은 null을 돌려주고 `RequestMappingHandlerMapping`(0)이 `OrderController#create`를 찾습니다.',
    },
    {
      question: '`DispatcherServlet`이 `HandlerAdapter`를 거쳐 handler를 부르는 이유는?',
      answer: 'handler의 타입이 여러 가지(`HandlerMethod`, `HttpRequestHandler`, functional endpoint 등)이기 때문입니다. `supports(handler)`가 true인 adapter가 실행 방법을 감싸므로 `doDispatch()`는 타입을 몰라도 됩니다. `@RequestMapping` 메서드는 `RequestMappingHandlerAdapter`가 맡습니다.',
    },
    {
      question: '`@RequestBody OrderRequest`는 어떤 두 컴포넌트를 거쳐 객체가 되나요?',
      answer: '`RequestResponseBodyMethodProcessor`(argument resolver)가 파라미터를 맡고, `Content-Type: application/json`을 읽을 수 있는 첫 `HttpMessageConverter`인 `JacksonJsonHttpMessageConverter`가 body를 역직렬화합니다.',
    },
    {
      question: '`@RestController` 메서드가 객체를 반환하면 왜 view rendering이 일어나지 않나요?',
      answer: '`RequestResponseBodyMethodProcessor.handleReturnValue()`가 `mavContainer.setRequestHandled(true)` 후 body를 직접 씁니다. 그래서 `getModelAndView()`가 null을 돌려주고, `processDispatchResult()`는 `mv`가 null이므로 `render()`를 부르지 않습니다.',
    },
    {
      question: '`postHandle()`에서 응답 header를 추가해도 반영되지 않는 이유와 대안은?',
      answer: '`@ResponseBody` 응답은 `HandlerAdapter` 안에서 이미 쓰이고 commit되었기 때문입니다. `ResponseBodyAdvice`를 쓰거나, Filter라면 `chain.doFilter()` 전에 header를 넣습니다.',
    },
    {
      question: '이 응답에 `Content-Length` 대신 `Transfer-Encoding: chunked`가 붙은 이유는?',
      answer: 'Jackson converter가 길이를 미리 정하지 않고 stream에 쓰고 `flush()`했기 때문입니다. Tomcat은 HTTP/1.1에서 body가 있고 길이를 모르면 chunked encoding을 고릅니다.',
    },
  ],
};
